export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeHeader(value: unknown): string {
  return stripAccents(String(value ?? ""))
    .toLowerCase()
    .replace(/[?:;.,()[\]{}_\-/\\º°#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeOrderNumber(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Number.isInteger(value) ? value.toFixed(0) : String(value);
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d+(\.0+)?$/.test(text)) return text.replace(/\.0+$/, "");
  const scientific = Number(text);
  if (/e/i.test(text) && Number.isFinite(scientific)) {
    return Number.isInteger(scientific) ? scientific.toFixed(0) : String(scientific);
  }
  return text;
}

export function normalizeDriverName(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || null;
}

export function normalizeDriverKey(value: string | null): string | null {
  if (!value) return null;
  const key = stripAccents(value).toUpperCase().replace(/\s+/g, " ").trim();
  return key || null;
}

export function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 24 * 60 * 60 * 1000);
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeTime(value: unknown): string | null {
  const date = normalizeDate(value);
  if (date) {
    return date.toISOString().slice(11, 19);
  }
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}:${match[3] ?? "00"}`;
}
