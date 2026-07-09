import type { PoolClient } from "pg";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { getPool } from "./db";
import { mapHeader, type CanonicalColumn } from "./column-mapper";
import {
  normalizeDate,
  normalizeDriverKey,
  normalizeDriverName,
  normalizeOrderNumber,
  normalizeTime
} from "./normalizer";

type ImportResult = {
  batchId: number;
  status: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errorRows: number;
};

type RawRow = Record<string, unknown>;
type MappedRow = Partial<Record<CanonicalColumn, unknown>>;
type XlsxSheet = { sheet: string; data: unknown[][] };
type XmlNode = Record<string, unknown>;
type HeaderMatch = {
  headerIndex: number;
  headers: unknown[];
  columnMap: (CanonicalColumn | null)[];
};

export async function importExcelFile(fileName: string, buffer: ArrayBuffer): Promise<ImportResult> {
  const sheets = await readXlsxSheets(Buffer.from(new Uint8Array(buffer)));

  const client = await getPool().connect();
  let batchId: number | null = null;

  try {
    await client.query("BEGIN");
    const batch = await client.query<{ id: number }>(
      `
        INSERT INTO import_batches (filename, status, started_at)
        VALUES ($1, 'running', now())
        RETURNING id
      `,
      [fileName]
    );
    batchId = batch.rows[0].id;

    const result: ImportResult = {
      batchId,
      status: "running",
      totalRows: 0,
      importedRows: 0,
      skippedRows: 0,
      errorRows: 0
    };

    for (const sheet of sheets) {
      const rows = cleanRows(sheet.data as unknown[][]);
      if (!rows.length) continue;

      const headerMatch = findHeaderRow(rows);
      if (!headerMatch) continue;

      for (let index = headerMatch.headerIndex + 1; index < rows.length; index += 1) {
        const rawRow = buildRawRow(headerMatch.headers, rows[index], sheet.sheet);
        const mappedRow = buildMappedRow(headerMatch.columnMap, rows[index]);
        if (isEmptyMappedRow(mappedRow)) continue;

        result.totalRows += 1;
        try {
          const imported = await importRow(client, mappedRow, sheet.sheet, fileName);
          if (imported) {
            result.importedRows += 1;
          } else {
            result.skippedRows += 1;
          }
        } catch (error) {
          result.errorRows += 1;
          await client.query(
            `
              INSERT INTO import_errors (import_batch_id, row_number, raw_data_json, error_message)
              VALUES ($1, $2, $3::jsonb, $4)
            `,
            [
              batchId,
              index + 1,
              JSON.stringify(rawRow),
              error instanceof Error ? error.message : String(error)
            ]
          );
        }
      }
    }

    result.status = result.errorRows ? "partial_success" : "success";
    const errorMessage =
      result.totalRows === 0
        ? "Nenhuma linha importavel encontrada. Confira se a planilha tem coluna de numero do pedido e motorista."
        : null;
    if (errorMessage) result.status = "failed";

    await client.query(
      `
        UPDATE import_batches
        SET
          status = $2,
          total_rows = $3,
          imported_rows = $4,
          skipped_rows = $5,
          error_rows = $6,
          finished_at = now(),
          error_message = $7
        WHERE id = $1
      `,
      [
        batchId,
        result.status,
        result.totalRows,
        result.importedRows,
        result.skippedRows,
        result.errorRows,
        errorMessage
      ]
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    const message = error instanceof Error ? error.message : String(error);
    const failed = await getPool().query<{ id: number }>(
      `
        INSERT INTO import_batches (filename, status, error_message, finished_at)
        VALUES ($1, 'failed', $2, now())
        RETURNING id
      `,
      [fileName, message]
    );
    return {
      batchId: batchId ?? failed.rows[0].id,
      status: "failed",
      totalRows: 0,
      importedRows: 0,
      skippedRows: 0,
      errorRows: 0
    };
  } finally {
    client.release();
  }
}

function cleanRows(rows: unknown[][]): unknown[][] {
  return rows.filter((row) =>
    row.some((value) => value !== null && value !== undefined && String(value).trim() !== "")
  );
}

function findHeaderRow(rows: unknown[][]): HeaderMatch | null {
  const searchLimit = Math.min(rows.length, 20);

  for (let index = 0; index < searchLimit; index += 1) {
    const headers = rows[index];
    const columnMap = headers.map((header) => mapHeader(header));
    if (columnMap.includes("order_number") && columnMap.includes("driver_name")) {
      return { headerIndex: index, headers, columnMap };
    }
  }

  for (let index = 0; index < searchLimit; index += 1) {
    const headers = rows[index];
    const columnMap = headers.map((header) => mapHeader(header));
    if (columnMap.includes("order_number")) {
      return { headerIndex: index, headers, columnMap };
    }
  }

  return null;
}

async function readXlsxSheets(buffer: Buffer): Promise<XlsxSheet[]> {
  const zip = await JSZip.loadAsync(buffer);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: false
  });

  const workbookXml = await readZipText(zip, "xl/workbook.xml");
  const workbookRelsXml = await readZipText(zip, "xl/_rels/workbook.xml.rels");
  const workbook = parser.parse(workbookXml) as XmlNode;
  const relationships = parser.parse(workbookRelsXml) as XmlNode;
  const sharedStrings = await readSharedStrings(zip, parser);

  const sheetNodes = asArray(getPath<XmlNode>(workbook, ["workbook", "sheets", "sheet"]));
  const relationshipNodes = asArray(
    getPath<XmlNode>(relationships, ["Relationships", "Relationship"])
  );
  const relationshipById = new Map<string, string>();

  for (const relationship of relationshipNodes) {
    const id = asString(relationship.Id);
    const target = asString(relationship.Target);
    if (id && target) relationshipById.set(id, resolveWorkbookTarget(target));
  }

  const sheets: XlsxSheet[] = [];
  for (const sheet of sheetNodes) {
    const name = asString(sheet.name) || "Planilha";
    const relationId = asString(sheet["r:id"]);
    const path = relationshipById.get(relationId);
    if (!path) continue;

    const xml = await readZipText(zip, path);
    const parsed = parser.parse(xml) as XmlNode;
    sheets.push({
      sheet: name,
      data: readWorksheetRows(parsed, sharedStrings)
    });
  }

  return sheets;
}

async function readSharedStrings(zip: JSZip, parser: XMLParser): Promise<string[]> {
  const file = zip.file("xl/sharedStrings.xml");
  if (!file) return [];

  const parsed = parser.parse(await file.async("text")) as XmlNode;
  return asArray(getPath<XmlNode>(parsed, ["sst", "si"])).map((item) => readSharedStringItem(item));
}

function readWorksheetRows(worksheet: XmlNode, sharedStrings: string[]): unknown[][] {
  const rows: unknown[][] = [];
  const rowNodes = asArray(getPath<XmlNode>(worksheet, ["worksheet", "sheetData", "row"]));

  for (const row of rowNodes) {
    const values: unknown[] = [];
    for (const cell of asArray(row.c)) {
      const index = columnIndexFromCellRef(asString(cell.r));
      values[index ?? values.length] = readCellValue(cell, sharedStrings);
    }
    rows.push(values.map((value) => value ?? null));
  }

  return rows;
}

function readCellValue(cell: XmlNode, sharedStrings: string[]): unknown {
  const type = asString(cell.t);
  const rawValue = textFromNode(cell.v);

  if (type === "s") return sharedStrings[Number(rawValue)] ?? "";
  if (type === "inlineStr") return readInlineString(cell.is);
  if (type === "b") return rawValue === "1";
  if (rawValue === "") return null;

  const numeric = Number(rawValue);
  return Number.isFinite(numeric) && /^-?\d+(\.\d+)?$/.test(rawValue) ? numeric : rawValue;
}

function readSharedStringItem(item: XmlNode): string {
  if ("t" in item) return textFromNode(item.t);
  return asArray(item.r).map((run) => textFromNode(run.t)).join("");
}

function readInlineString(value: unknown): string {
  if (!isObject(value)) return "";
  if ("t" in value) return textFromNode(value.t);
  return asArray(value.r).map((run) => textFromNode(run.t)).join("");
}

function textFromNode(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (isObject(value)) return textFromNode(value["#text"]);
  return "";
}

function columnIndexFromCellRef(reference: string): number | null {
  const match = reference.match(/^[A-Z]+/i);
  if (!match) return null;

  let index = 0;
  for (const letter of match[0].toUpperCase()) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return index - 1;
}

function resolveWorkbookTarget(target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  if (target.startsWith("xl/")) return target;
  return `xl/${target}`;
}

async function readZipText(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) throw new Error(`Arquivo interno do Excel nao encontrado: ${path}`);
  return file.async("text");
}

function getPath<T>(node: XmlNode, path: string[]): T | undefined {
  let current: unknown = node;
  for (const segment of path) {
    if (!isObject(current)) return undefined;
    current = current[segment];
  }
  return current as T | undefined;
}

function asArray(value: unknown): XmlNode[] {
  if (Array.isArray(value)) return value.filter(isObject);
  return isObject(value) ? [value] : [];
}

function asString(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function isObject(value: unknown): value is XmlNode {
  return typeof value === "object" && value !== null;
}

function buildRawRow(headers: unknown[], row: unknown[], sheetName: string): RawRow {
  const raw: RawRow = { _source_sheet: sheetName };
  headers.forEach((header, index) => {
    raw[String(header ?? `coluna_${index + 1}`)] = serializeValue(row[index]);
  });
  return raw;
}

function buildMappedRow(columnMap: (CanonicalColumn | null)[], row: unknown[]): MappedRow {
  const mapped: MappedRow = {};
  columnMap.forEach((canonical, index) => {
    if (canonical) mapped[canonical] = row[index];
  });
  return mapped;
}

function isEmptyMappedRow(row: MappedRow): boolean {
  return Object.values(row).every((value) => value === null || value === undefined || value === "");
}

async function importRow(
  client: PoolClient,
  row: MappedRow,
  sheetName: string,
  fileName: string
): Promise<boolean> {
  const orderNumber = normalizeOrderNumber(row.order_number);
  if (!orderNumber) throw new Error("Numero do pedido obrigatorio.");

  const driverName = normalizeDriverName(row.driver_name);
  const normalizedDriverName = normalizeDriverKey(driverName);
  if (!driverName || !normalizedDriverName) throw new Error("Motorista obrigatorio.");

  const driver = await client.query<{ id: number }>(
    `
      INSERT INTO drivers (name, normalized_name, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (normalized_name) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = now()
      RETURNING id
    `,
    [driverName, normalizedDriverName]
  );

  const deliveryTime = normalizeTime(row.delivery_time);
  const deliveryDatetime = normalizeDate(row.delivery_datetime);
  const createdDatetime = normalizeDate(row.created_datetime);

  const inserted = await client.query<{ id: number }>(
    `
      INSERT INTO orders (
        order_number,
        driver_id,
        delivery_responsible_raw,
        delivery_time,
        delivery_datetime,
        created_datetime,
        has_careacao,
        is_resolved,
        has_discount,
        discount_value,
        source_sheet,
        source_file,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, false, false, false, null, $7, $8, now())
      ON CONFLICT (order_number) DO NOTHING
      RETURNING id
    `,
    [
      orderNumber,
      driver.rows[0].id,
      driverName,
      deliveryTime,
      deliveryDatetime,
      createdDatetime,
      sheetName,
      fileName
    ]
  );

  return inserted.rowCount === 1;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}
