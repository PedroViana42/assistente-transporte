import { describe, expect, it } from "vitest";
import { IMPORT_CAREACAO_RULE, shouldCreateCareacaoCaseFromImport } from "./careacao-rule";

describe("import careacao rule", () => {
  it("keeps careacao creation manual during import", () => {
    expect(
      shouldCreateCareacaoCaseFromImport({
        hasCareacao: true,
        isResolved: false,
        discountValue: "10.00"
      })
    ).toBe(false);
    expect(IMPORT_CAREACAO_RULE).toContain("manualmente");
  });
});
