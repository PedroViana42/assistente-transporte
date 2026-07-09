import ExcelJS from "exceljs";
import JSZip from "jszip";
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

  it("reads workbooks that use XML namespace prefixes", async () => {
    const zip = new JSZip();
    zip.file(
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="utf-8"?>
      <x:workbook xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <x:sheets>
          <x:sheet name="Pedidos" sheetId="1" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" />
        </x:sheets>
      </x:workbook>`
    );
    zip.file(
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="utf-8"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet1.xml" Id="rId1" />
      </Relationships>`
    );
    zip.file(
      "xl/worksheets/sheet1.xml",
      `<?xml version="1.0" encoding="utf-8"?>
      <x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <x:sheetData>
          <x:row r="1">
            <x:c r="A1" t="str"><x:v>Número de pedido JMS</x:v></x:c>
            <x:c r="B1" t="str"><x:v>Responsável pela entrega</x:v></x:c>
          </x:row>
          <x:row r="2">
            <x:c r="A2" t="str"><x:v>100001</x:v></x:c>
            <x:c r="B2" t="str"><x:v>João da Silva</x:v></x:c>
          </x:row>
        </x:sheetData>
      </x:worksheet>`
    );

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const sheets = await readXlsxSheets(buffer);
    const rows = cleanRows(sheets[0].data);

    expect(sheets[0].sheet).toBe("Pedidos");
    expect(rows[1]).toEqual(["100001", "João da Silva"]);
    expect(findHeaderRow(rows)?.columnMap).toEqual(["order_number", "driver_name"]);
  });
});
