import { describe, expect, it } from "vitest";
import { mapHeader, mapHeaders } from "./column-mapper";

describe("column mapper", () => {
  it("maps known spreadsheet headers ignoring accents, case and punctuation", () => {
    expect(mapHeader("Número de pedido JMS")).toBe("order_number");
    expect(mapHeader("Responsável pela entrega")).toBe("driver_name");
    expect(mapHeader("careação?")).toBe("has_careacao");
    expect(mapHeader("resolvido?")).toBe("is_resolved");
    expect(mapHeader("valor desconto")).toBe("discount_value");
    expect(mapHeader("ENTREGADOR")).toBe("driver_name");
    expect(mapHeader("DATA INICIO")).toBe("created_datetime");
    expect(mapHeader("DATA FINAL")).toBe("delivery_datetime");
    expect(mapHeader("DESCONTO")).toBe("has_discount");
  });

  it("ignores unknown and duplicate headers", () => {
    expect(mapHeaders(["Pedido", "Numero pedido", "Motorista", "Outro"])).toEqual([
      "order_number",
      null,
      "driver_name",
      null
    ]);
  });
});
