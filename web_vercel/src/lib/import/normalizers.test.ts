import { describe, expect, it } from "vitest";
import {
  normalizeBoolean,
  normalizeDate,
  normalizeDecimal,
  normalizeDriverKey,
  normalizeDriverName,
  normalizeOrderNumber,
  normalizeTime
} from "./normalizers";

describe("normalizers", () => {
  it("normalizes order numbers as strings without scientific notation", () => {
    expect(normalizeOrderNumber(12345)).toBe("12345");
    expect(normalizeOrderNumber("12345.0")).toBe("12345");
    expect(normalizeOrderNumber("1.2345E+7")).toBe("12345000");
    expect(normalizeOrderNumber("000123")).toBe("000123");
  });

  it("normalizes driver name and key", () => {
    expect(normalizeDriverName("  Joao   da   Silva ")).toBe("Joao da Silva");
    expect(normalizeDriverKey(" João   da Silva ")).toBe("JOAO DA SILVA");
  });

  it("normalizes booleans", () => {
    expect(normalizeBoolean("SIM")).toBe(true);
    expect(normalizeBoolean("s")).toBe(true);
    expect(normalizeBoolean("TRUE")).toBe(true);
    expect(normalizeBoolean("1")).toBe(true);
    expect(normalizeBoolean("NÃO")).toBe(false);
    expect(normalizeBoolean("nao")).toBe(false);
    expect(normalizeBoolean("false")).toBe(false);
    expect(normalizeBoolean("0")).toBe(false);
    expect(normalizeBoolean("")).toBeNull();
  });

  it("rejects unknown boolean values", () => {
    expect(() => normalizeBoolean("talvez")).toThrow("Valor booleano invalido");
  });

  it("normalizes dates from Brazilian strings, ISO strings and Excel serial values", () => {
    expect(normalizeDate("09/07/2026")?.toISOString().slice(0, 10)).toBe("2026-07-09");
    expect(normalizeDate("2026-07-09")?.toISOString().slice(0, 10)).toBe("2026-07-09");
    expect(normalizeDate("46212")?.toISOString().slice(0, 10)).toBe("2026-07-09");
  });

  it("normalizes time from strings and Excel serial fractions", () => {
    expect(normalizeTime("8:05")).toBe("08:05:00");
    expect(normalizeTime("0.5")).toBe("12:00:00");
  });

  it("normalizes decimal values with comma or point", () => {
    expect(normalizeDecimal("10,50")).toBe("10.50");
    expect(normalizeDecimal("1.234,56")).toBe("1234.56");
    expect(normalizeDecimal("1,234.56")).toBe("1234.56");
    expect(normalizeDecimal("")).toBeNull();
  });
});
