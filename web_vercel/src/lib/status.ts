export const CAREACAO_STATUSES = [
  "pendente",
  "em_tratativa",
  "respondido",
  "resolvido",
  "cancelado"
] as const;

export type CareacaoStatus = (typeof CAREACAO_STATUSES)[number];

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_tratativa: "Em tratativa",
    respondido: "Respondido",
    resolvido: "Resolvido",
    cancelado: "Cancelado"
  };

  return labels[status] ?? status;
}

export function isClosedStatus(status: string): boolean {
  return status === "resolvido" || status === "cancelado";
}
