export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

export function normalizeHeader(value: unknown): string {
  return stripAccents(String(value ?? ""))
    .toLowerCase()
    .replace(/[?:;.,()[\]{}_\-/\\º°#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeOrderNumber(value: unknown): string | null {
  if (isEmptyValue(value)) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Number.isInteger(value) ? value.toFixed(0) : trimNumericText(String(value));
  }

  const text = String(value).trim();
  if (!text) return null;

  const scientific = scientificToPlainString(text);
  if (scientific) return trimNumericText(scientific);

  if (/^[+-]?\d+(\.0+)?$/.test(text)) return text.replace(/^\+/, "").replace(/\.0+$/, "");

  return text;
}

export function normalizeDriverName(value: unknown): string | null {
  if (isEmptyValue(value)) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || null;
}

export function normalizeDriverKey(value: unknown): string | null {
  const name = normalizeDriverName(value);
  if (!name) return null;
  const key = stripAccents(name).toUpperCase().replace(/\s+/g, " ").trim();
  return key || null;
}

export function normalizeBoolean(value: unknown): boolean | null {
  if (isEmptyValue(value)) return null;

  const normalized = stripAccents(String(value)).toUpperCase().replace(/\s+/g, " ").trim();
  if (["SIM", "S", "TRUE", "1"].includes(normalized)) return true;
  if (["NAO", "N", "FALSE", "0"].includes(normalized)) return false;

  throw new Error(`Valor booleano invalido: ${String(value)}`);
}

export function normalizeDate(value: unknown): Date | null {
  if (isEmptyValue(value)) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const numericValue = toFiniteNumber(value);
  if (numericValue !== null && numericValue > 0 && numericValue < 100000) {
    return excelSerialDateToDate(numericValue);
  }

  const text = String(value).trim();
  const parsedBrazilian = parseBrazilianDate(text);
  if (parsedBrazilian) return parsedBrazilian;

  const parsedIso = parseIsoLikeDate(text);
  if (parsedIso) return parsedIso;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeTime(value: unknown): string | null {
  if (isEmptyValue(value)) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return timeFromDate(value);
  }

  const numericValue = toFiniteNumber(value);
  if (numericValue !== null && numericValue >= 0) {
    return timeFromExcelSerial(numericValue);
  }

  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}:${match[3] ?? "00"}`;

  const date = normalizeDate(value);
  return date ? timeFromDate(date) : null;
}

export function normalizeDecimal(value: unknown): string | null {
  if (isEmptyValue(value)) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Decimal invalido: ${String(value)}`);
    return String(value);
  }

  let text = String(value).trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!text) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    text = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (text.includes(",") && text.split(",").length > 2) {
    text = text.replace(/,/g, "");
  } else if (text.includes(".") && text.split(".").length > 2) {
    text = text.replace(/\./g, "");
  } else if (lastComma >= 0) {
    text = normalizeSingleDecimalSeparator(text, ",");
  } else if (lastDot >= 0) {
    text = normalizeSingleDecimalSeparator(text, ".");
  } else {
    text = text.replace(",", ".");
  }

  const number = Number(text);
  if (!Number.isFinite(number)) throw new Error(`Decimal invalido: ${String(value)}`);
  return text;
}

function normalizeSingleDecimalSeparator(value: string, separator: "," | "."): string {
  const [integer, fraction = ""] = value.split(separator);
  if (!fraction) return integer;

  if (fraction.length === 3 && integer.replace(/^[+-]/, "").length <= 3) {
    return `${integer}${fraction}`;
  }

  return separator === "," ? `${integer}.${fraction}` : value;
}

function trimNumericText(value: string): string {
  return value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
}

function scientificToPlainString(value: string): string | null {
  const match = value.match(/^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
  if (!match) return null;

  const [, sign, integer, fraction = "", exponentText] = match;
  const exponent = Number(exponentText);
  if (!Number.isInteger(exponent)) return null;

  const digits = `${integer}${fraction}`;
  const decimalIndex = integer.length + exponent;

  if (decimalIndex <= 0) {
    return `${sign}0.${"0".repeat(Math.abs(decimalIndex))}${digits}`;
  }

  if (decimalIndex >= digits.length) {
    return `${sign}${digits}${"0".repeat(decimalIndex - digits.length)}`;
  }

  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const text = value.trim().replace(",", ".");
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) return null;

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function excelSerialDateToDate(serial: number): Date {
  const excelEpoch = Date.UTC(1899, 11, 30);
  return new Date(excelEpoch + serial * 24 * 60 * 60 * 1000);
}

function timeFromExcelSerial(serial: number): string {
  const fraction = serial - Math.floor(serial);
  const totalSeconds = Math.round(fraction * 24 * 60 * 60);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function timeFromDate(date: Date): string {
  return date.toISOString().slice(11, 19);
}

function parseBrazilianDate(value: string): Date | null {
  const match = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!match) return null;

  const [, dayText, monthText, yearText, hourText = "0", minuteText = "0", secondText = "0"] = match;
  const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
  const date = new Date(Date.UTC(year, Number(monthText) - 1, Number(dayText), Number(hourText), Number(minuteText), Number(secondText)));

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseIsoLikeDate(value: string): Date | null {
  const match = value.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText = "0", minuteText = "0", secondText = "0"] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText), Number(hourText), Number(minuteText), Number(secondText)));

  return Number.isNaN(date.getTime()) ? null : date;
}
