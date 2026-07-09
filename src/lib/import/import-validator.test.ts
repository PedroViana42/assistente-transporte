import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_SIZE_BYTES, validateImportFile } from "./import-validator";

describe("import validator", () => {
  it("accepts valid xlsx files within the limit", () => {
    expect(validateImportFile("pedidos.xlsx", 1024)).toEqual({ ok: true });
  });

  it("rejects empty, oversized and non-xlsx files", () => {
    expect(validateImportFile("", 0)).toMatchObject({ ok: false, code: "arquivo" });
    expect(validateImportFile("pedidos.xlsx", MAX_UPLOAD_SIZE_BYTES + 1)).toMatchObject({
      ok: false,
      code: "tamanho"
    });
    expect(validateImportFile("pedidos.csv", 1024)).toMatchObject({ ok: false, code: "formato" });
  });
});
