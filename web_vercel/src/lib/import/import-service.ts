import type { PoolClient } from "pg";
import { getPool } from "../db";
import type { CanonicalColumn } from "./column-mapper";
import { cleanRows, findHeaderRow, readXlsxSheets } from "./excel-parser";
import {
  normalizeDate,
  normalizeDriverKey,
  normalizeDriverName,
  normalizeOrderNumber,
  normalizeTime
} from "./normalizers";

export type ImportResult = {
  batchId: number;
  status: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errorRows: number;
};

type RawRow = Record<string, unknown>;
type MappedRow = Partial<Record<CanonicalColumn, unknown>>;

export async function importExcelFile(fileName: string, buffer: ArrayBuffer): Promise<ImportResult> {
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

    const sheets = await readXlsxSheets(Buffer.from(new Uint8Array(buffer)));

    for (const sheet of sheets) {
      const rows = cleanRows(sheet.data);
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
      [fileName, friendlyImportError(message)]
    );
    return {
      batchId: failed.rows[0].id,
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

export function buildRawRow(headers: unknown[], row: unknown[], sheetName: string): RawRow {
  const raw: RawRow = { _source_sheet: sheetName };
  headers.forEach((header, index) => {
    raw[String(header ?? `coluna_${index + 1}`)] = serializeValue(row[index]);
  });
  return raw;
}

export function buildMappedRow(columnMap: (CanonicalColumn | null)[], row: unknown[]): MappedRow {
  const mapped: MappedRow = {};
  columnMap.forEach((canonical, index) => {
    if (canonical) mapped[canonical] = row[index];
  });
  return mapped;
}

export function isEmptyMappedRow(row: MappedRow): boolean {
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

function friendlyImportError(message: string): string {
  if (/end of data|corrupt|zip|not found|arquivo interno/i.test(message)) {
    return "Nao foi possivel ler o arquivo Excel. Confira se o arquivo nao esta corrompido e esta no formato .xlsx.";
  }
  return message;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}
