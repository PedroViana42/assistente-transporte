import { normalizeHeader } from "./normalizer";

export type CanonicalColumn =
  | "order_number"
  | "driver_name"
  | "delivery_time"
  | "delivery_datetime"
  | "created_datetime";

const COLUMN_ALIASES: Record<CanonicalColumn, string[]> = {
  order_number: [
    "numero de pedido jms",
    "numero pedido jms",
    "numero de pedido",
    "pedido",
    "order number"
  ],
  driver_name: [
    "responsavel pela entrega",
    "entregador",
    "motorista",
    "driver",
    "driver name"
  ],
  delivery_time: ["horario da entrega", "hora entrega", "delivery time"],
  delivery_datetime: ["data final", "data entrega", "delivery datetime"],
  created_datetime: ["data inicio", "data criacao", "created datetime"]
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
