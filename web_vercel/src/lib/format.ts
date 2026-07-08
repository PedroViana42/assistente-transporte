export function formatCurrency(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);
  return numeric.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function faultLabel(value: boolean | null | undefined): string {
  if (value === true) return "Culpa do cliente";
  if (value === false) return "Nao foi culpa do cliente";
  return "Nao definido";
}
