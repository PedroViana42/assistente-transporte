import { CAREACAO_STATUSES } from "./status";

export type CareacaoFilters = {
  status?: string;
  driver?: string;
  startDate?: string;
  endDate?: string;
  order?: string;
};

export type CareacaoSort = "updated_desc" | "updated_asc" | "opened_desc" | "opened_asc";

export function normalizeCareacaoStatus(status?: string): string {
  if (!status || status === "todos") return "todos";
  return (CAREACAO_STATUSES as readonly string[]).includes(status) ? status : "todos";
}

export function normalizeCareacaoSort(sort?: string): CareacaoSort {
  if (sort === "updated_asc" || sort === "opened_desc" || sort === "opened_asc") return sort;
  return "updated_desc";
}

export function buildCareacaoWhereClause(
  filters: CareacaoFilters,
  startIndex = 1
): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const status = normalizeCareacaoStatus(filters.status);

  if (status !== "todos") {
    params.push(status);
    clauses.push(`c.status = $${startIndex + params.length - 1}`);
  }

  if (filters.driver?.trim()) {
    params.push(`%${filters.driver.trim()}%`);
    clauses.push(`d.name ILIKE $${startIndex + params.length - 1}`);
  }

  if (filters.order?.trim()) {
    params.push(`%${filters.order.trim()}%`);
    clauses.push(`o.order_number ILIKE $${startIndex + params.length - 1}`);
  }

  if (filters.startDate) {
    params.push(filters.startDate);
    clauses.push(`c.opened_at::date >= $${startIndex + params.length - 1}::date`);
  }

  if (filters.endDate) {
    params.push(filters.endDate);
    clauses.push(`c.opened_at::date <= $${startIndex + params.length - 1}::date`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params
  };
}

export function careacaoOrderBy(sort?: string): string {
  switch (normalizeCareacaoSort(sort)) {
    case "updated_asc":
      return "c.updated_at ASC, c.id ASC";
    case "opened_desc":
      return "c.opened_at DESC, c.id DESC";
    case "opened_asc":
      return "c.opened_at ASC, c.id ASC";
    case "updated_desc":
    default:
      return "c.updated_at DESC, c.id DESC";
  }
}
