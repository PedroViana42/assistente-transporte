import { beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "./db";
import { buildReportWorkbook } from "./report";

vi.mock("./db", () => ({
  query: vi.fn()
}));

describe("report", () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it("generates filtered careacao reports in memory", async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          "Numero do pedido": "123",
          Motorista: "Maria",
          Status: "pendente",
          "Data de abertura": "09/07/2026 10:00",
          "Ultima atualizacao": "09/07/2026 10:30",
          "Data de resolucao": null,
          Valor: 15.5,
          "Culpa do cliente": "Sim",
          Motivo: "Endereco incorreto",
          "Observacao interna": "Conferido",
          "Resposta do motorista": "Aguardando"
        }
      ],
      command: "SELECT",
      rowCount: 1,
      oid: 0,
      fields: []
    });

    const buffer = await buildReportWorkbook("careacoes", {
      status: "pendente",
      order: "123"
    });
    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(vi.mocked(query).mock.calls[0][0]).toContain("o.order_number ILIKE $2");
    expect(vi.mocked(query).mock.calls[0][1]).toEqual(["pendente", "%123%"]);
  });
});
