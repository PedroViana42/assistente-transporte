import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { cleanRows, findHeaderRow, readXlsxSheets } from "./excel-parser";

describe("excel parser", () => {
  it("removes fully empty rows", () => {
    expect(cleanRows([["Pedido"], [null, ""], ["123"]])).toEqual([["Pedido"], ["123"]]);
  });

  it("finds the real header row in the first 20 rows", () => {
    const match = findHeaderRow([
      ["Relatorio"],
      ["Gerado em", "2026-07-09"],
      ["Numero de pedido JMS", "Responsavel pela entrega"],
      ["123", "Joao"]
    ]);

    expect(match?.headerIndex).toBe(2);
    expect(match?.columnMap).toEqual(["order_number", "driver_name"]);
  });

  it("reads all workbook sheets and preserves sheet names", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Pedidos").addRows([
      ["Numero de pedido JMS", "Responsavel pela entrega"],
      ["9001", "Maria"]
    ]);
    workbook.addWorksheet("Vazia");

    const buffer = await workbook.xlsx.writeBuffer();
    const sheets = await readXlsxSheets(Buffer.from(buffer));

    expect(sheets.map((sheet) => sheet.sheet)).toEqual(["Pedidos", "Vazia"]);
    expect(sheets[0].data[1]).toEqual(["9001", "Maria"]);
  });
});
