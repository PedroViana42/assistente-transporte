import { describe, expect, it } from "vitest";
import {
  formatMoneyFromCents,
  moneyCentsToDecimal,
  moneyMaskInputToCents,
  moneyToDecimal,
  parseMoneyToCents
} from "./money";

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

  it("converts fixed-comma mask input into cents", () => {
    expect(moneyMaskInputToCents("1")).toBe(1);
    expect(moneyMaskInputToCents("12")).toBe(12);
    expect(moneyMaskInputToCents("123")).toBe(123);
    expect(moneyMaskInputToCents("1234")).toBe(1234);
    expect(moneyMaskInputToCents("R$ 12,34")).toBe(1234);
  });

  it("keeps the comma fixed while appending typed digits", () => {
    let cents = moneyMaskInputToCents("1");
    expect(formatMoneyFromCents(cents)).toBe("R$ 0,01");

    cents = moneyMaskInputToCents(`${formatMoneyFromCents(cents)}2`);
    expect(formatMoneyFromCents(cents)).toBe("R$ 0,12");

    cents = moneyMaskInputToCents(`${formatMoneyFromCents(cents)}3`);
    expect(formatMoneyFromCents(cents)).toBe("R$ 1,23");

    cents = moneyMaskInputToCents(`${formatMoneyFromCents(cents)}4`);
    expect(formatMoneyFromCents(cents)).toBe("R$ 12,34");
  });
});
