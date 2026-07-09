import { normalizeHeader } from "./normalizers";

export type CanonicalColumn =
  | "order_number"
  | "driver_name"
  | "delivery_time"
  | "delivery_datetime"
  | "created_datetime"
  | "has_careacao"
  | "is_resolved"
  | "has_discount"
  | "discount_value";

export const COLUMN_ALIASES: Record<CanonicalColumn, string[]> = {
  order_number: [
    "numero de pedido jms",
    "numero pedido jms",
    "numero de pedido",
    "numero pedido",
    "n pedido",
    "pedido jms",
    "cod pedido",
    "codigo pedido",
    "pedido",
    "order number"
  ],
  driver_name: [
    "responsavel pela entrega",
    "responsavel entrega",
    "entregador",
    "motorista",
    "nome motorista",
    "nome entregador",
    "driver",
    "driver name"
  ],
  delivery_time: [
    "horario da entrega",
    "horario entrega",
    "hora da entrega",
    "hora entrega",
    "delivery time"
  ],
  delivery_datetime: ["data final", "data entrega", "delivery datetime"],
  created_datetime: [
    "data inicio",
    "data de criacao",
    "data criacao",
    "created datetime"
  ],
  has_careacao: ["careacao", "careacao?", "has careacao"],
  is_resolved: ["resolvido", "resolvido?", "resolved"],
  has_discount: ["desconto", "desconto?", "has discount"],
  discount_value: ["valor desconto", "valor do desconto", "discount value"]
};

const ALIAS_TO_CANONICAL = new Map<string, CanonicalColumn>();

for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES) as [CanonicalColumn, string[]][]) {
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(normalizeHeader(alias), canonical);
  }
}

export function mapHeader(value: unknown): CanonicalColumn | null {
  return ALIAS_TO_CANONICAL.get(normalizeHeader(value)) ?? null;
}

export function mapHeaders(headers: unknown[]): (CanonicalColumn | null)[] {
  const seen = new Set<CanonicalColumn>();

  return headers.map((header) => {
    const canonical = mapHeader(header);
    if (!canonical || seen.has(canonical)) return null;
    seen.add(canonical);
    return canonical;
  });
}
