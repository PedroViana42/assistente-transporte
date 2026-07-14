import { describe, expect, it } from "vitest";
import { formatMoneyFromCents, moneyCentsToDecimal, moneyToDecimal, parseMoneyToCents } from "./money";

describe("money", () => {
  it("parses typed money values into cents", () => {
    expect(parseMoneyToCents("1234")).toBe(123400);
    expect(parseMoneyToCents("12,34")).toBe(1234);
    expect(parseMoneyToCents("12.34")).toBe(1234);
    expect(parseMoneyToCents("R$ 12,34")).toBe(1234);
    expect(parseMoneyToCents("R$ 12.34")).toBe(1234);
    expect(parseMoneyToCents("1.234,56")).toBe(123456);
    expect(parseMoneyToCents("1,234.56")).toBe(123456);
    expect(parseMoneyToCents("1.234")).toBe(123400);
    expect(parseMoneyToCents("1,234")).toBe(123400);
  });

  it("formats cents as Brazilian currency text", () => {
    expect(formatMoneyFromCents(0)).toBe("R$ 0,00");
    expect(formatMoneyFromCents(1234)).toBe("R$ 12,34");
    expect(formatMoneyFromCents(123456)).toBe("R$ 1.234,56");
  });

  it("serializes cents for form submission", () => {
    expect(moneyCentsToDecimal(0)).toBe("0.00");
    expect(moneyCentsToDecimal(1234)).toBe("12.34");
    expect(moneyCentsToDecimal(123456)).toBe("1234.56");
  });

  it("normalizes typed money to decimal strings for forms", () => {
    expect(moneyToDecimal("1234")).toBe("1234.00");
    expect(moneyToDecimal("12,34")).toBe("12.34");
    expect(moneyToDecimal("12.34")).toBe("12.34");
    expect(moneyToDecimal("1.234,56")).toBe("1234.56");
  });
});
