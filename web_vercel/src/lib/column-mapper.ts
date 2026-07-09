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
    "n mero de pedido jms",
    "numero pedido jms",
    "n mero pedido jms",
    "numero de pedido",
    "n mero de pedido",
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
    "respons vel pela entrega",
    "responsavel entrega",
    "entregador",
    "motorista",
    "nome motorista",
    "nome entregador",
    "driver",
    "driver name"
  ],
  delivery_time: ["horario da entrega", "hor rio da entrega", "hora entrega", "delivery time"],
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
