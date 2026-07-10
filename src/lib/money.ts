export function parseMoneyToCents(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  }

  let text = String(value).trim();
  if (!text) return null;

  const isNegative = /^-/.test(text);
  text = text.replace(/[^\d.,]/g, "");
  if (!/\d/.test(text)) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  let cents: number;

  if (lastComma >= 0 && lastDot >= 0) {
    cents = parseExplicitDecimal(text, lastComma > lastDot ? "," : ".");
  } else if (lastComma >= 0) {
    cents = parseSingleSeparator(text, ",");
  } else if (lastDot >= 0) {
    cents = parseSingleSeparator(text, ".");
  } else {
    cents = Number(text);
  }

  if (!Number.isFinite(cents)) return null;
  return isNegative ? -cents : cents;
}

export function formatMoneyFromCents(value: number | null | undefined): string {
  const cents = Number.isFinite(value) ? Math.trunc(Number(value)) : 0;
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const integer = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fraction = String(absolute % 100).padStart(2, "0");

  return `${sign}R$ ${integer},${fraction}`;
}

export function moneyCentsToDecimal(value: number | null | undefined): string {
  const cents = Number.isFinite(value) ? Math.trunc(Number(value)) : 0;
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const integer = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");

  return `${sign}${integer}.${fraction}`;
}

function parseExplicitDecimal(value: string, separator: "," | "."): number {
  const separatorIndex = value.lastIndexOf(separator);
  const integer = onlyDigits(value.slice(0, separatorIndex)) || "0";
  const fraction = onlyDigits(value.slice(separatorIndex + 1)).slice(0, 2).padEnd(2, "0");

  return Number(`${integer}${fraction}`);
}

function parseSingleSeparator(value: string, separator: "," | "."): number {
  const parts = value.split(separator);
  if (parts.length > 2) return Number(onlyDigits(value)) * 100;

  const integer = onlyDigits(parts[0]) || "0";
  const fraction = onlyDigits(parts[1] ?? "");

  if (!fraction) return Number(integer) * 100;
  if (fraction.length === 3 && integer.length <= 3) return Number(`${integer}${fraction}`) * 100;
  if (fraction.length <= 2) return Number(`${integer}${fraction.padEnd(2, "0")}`);

  return Number(`${integer}${fraction}`);
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
