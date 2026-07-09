import { describe, expect, it } from "vitest";
import {
  buildCareacaoWhereClause,
  careacaoOrderBy,
  normalizeCareacaoSort,
  normalizeCareacaoStatus
} from "./careacao-filters";

describe("careacao filters", () => {
  it("normalizes unsafe status and sort values", () => {
    expect(normalizeCareacaoStatus("resolvido")).toBe("resolvido");
    expect(normalizeCareacaoStatus("qualquer")).toBe("todos");
    expect(normalizeCareacaoSort("opened_asc")).toBe("opened_asc");
    expect(normalizeCareacaoSort("drop table")).toBe("updated_desc");
  });

  it("builds parametrized where clauses", () => {
    const result = buildCareacaoWhereClause({
      status: "pendente",
      driver: "Maria",
      order: "123",
      startDate: "2026-07-01",
      endDate: "2026-07-09"
    });

    expect(result.where).toContain("c.status = $1");
    expect(result.where).toContain("d.name ILIKE $2");
    expect(result.where).toContain("o.order_number ILIKE $3");
    expect(result.params).toEqual(["pendente", "%Maria%", "%123%", "2026-07-01", "2026-07-09"]);
  });

  it("uses whitelisted order by clauses", () => {
    expect(careacaoOrderBy("opened_desc")).toBe("c.opened_at DESC, c.id DESC");
    expect(careacaoOrderBy("anything")).toBe("c.updated_at DESC, c.id DESC");
  });
});
