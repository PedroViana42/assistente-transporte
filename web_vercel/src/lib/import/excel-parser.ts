import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { mapHeaders, type CanonicalColumn } from "./column-mapper";

export type XlsxSheet = { sheet: string; data: unknown[][] };
export type HeaderMatch = {
  headerIndex: number;
  headers: unknown[];
  columnMap: (CanonicalColumn | null)[];
};

type XmlNode = Record<string, unknown>;

export function cleanRows(rows: unknown[][]): unknown[][] {
  return rows.filter((row) =>
    row.some((value) => value !== null && value !== undefined && String(value).trim() !== "")
  );
}

export function findHeaderRow(rows: unknown[][]): HeaderMatch | null {
  const searchLimit = Math.min(rows.length, 20);

  for (let index = 0; index < searchLimit; index += 1) {
    const headers = rows[index];
    const columnMap = mapHeaders(headers);
    if (columnMap.includes("order_number") && columnMap.includes("driver_name")) {
      return { headerIndex: index, headers, columnMap };
    }
  }

  for (let index = 0; index < searchLimit; index += 1) {
    const headers = rows[index];
    const columnMap = mapHeaders(headers);
    if (columnMap.includes("order_number")) {
      return { headerIndex: index, headers, columnMap };
    }
  }

  return null;
}

export async function readXlsxSheets(buffer: Buffer): Promise<XlsxSheet[]> {
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

  return rawValue;
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
