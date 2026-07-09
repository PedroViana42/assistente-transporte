import { query } from "./db";
import { buildCareacaoWhereClause, careacaoOrderBy, type CareacaoFilters } from "./careacao-filters";

export type DashboardStats = {
  orders_total: string;
  drivers_total: string;
  open_cases_total: string;
  cases_with_amount_total: string;
  total_amount: string | null;
};

export type OrderSummary = {
  id: number;
  order_number: string;
  driver_id: number;
  driver_name: string;
  created_datetime: string | null;
  delivery_datetime: string | null;
  discount_value: string | null;
  source_file: string | null;
  source_sheet: string | null;
  case_id: number | null;
  case_status: string | null;
  case_amount: string | null;
  is_customer_fault: boolean | null;
};

export type CareacaoCase = {
  id: number;
  order_id: number;
  order_number: string;
  driver_id: number;
  driver_name: string;
  status: string;
  amount: string;
  is_customer_fault: boolean | null;
  fault_reason: string | null;
  internal_note: string | null;
  driver_response: string | null;
  opened_at: string;
  updated_at: string;
  closed_at: string | null;
  created_datetime: string | null;
  delivery_datetime: string | null;
};

export type CareacaoListResult = {
  rows: CareacaoCase[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CareacaoHistoryRow = {
  id: number;
  careacao_id: number;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  previous_values_json: Record<string, unknown> | null;
  new_values_json: Record<string, unknown> | null;
  actor: string | null;
  created_at: string;
};

export type ImportBatch = {
  id: number;
  filename: string;
  status: string;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  error_rows: number;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
};

export type ImportErrorRow = {
  id: number;
  row_number: number;
  raw_data_json: Record<string, unknown>;
  error_message: string;
  created_at: string;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await query<DashboardStats>(`
    SELECT
      (SELECT count(*) FROM orders)::text AS orders_total,
      (SELECT count(*) FROM drivers)::text AS drivers_total,
      (SELECT count(*) FROM careacao_cases WHERE status IN ('pendente', 'em_tratativa', 'aguardando_motorista', 'respondido'))::text AS open_cases_total,
      (SELECT count(*) FROM careacao_cases WHERE amount > 0)::text AS cases_with_amount_total,
      (SELECT COALESCE(sum(amount), 0) FROM careacao_cases)::text AS total_amount
  `);

  return result.rows[0];
}

export async function getRecentOpenCases(): Promise<CareacaoCase[]> {
  const result = await query<CareacaoCase>(`
    SELECT
      c.id,
      c.order_id,
      o.order_number,
      c.driver_id,
      d.name AS driver_name,
      c.status,
      c.amount::text,
      c.is_customer_fault,
      c.fault_reason,
      c.internal_note,
      c.driver_response,
      c.opened_at::text,
      c.updated_at::text,
      c.closed_at::text,
      o.created_datetime::text,
      o.delivery_datetime::text
    FROM careacao_cases c
    JOIN orders o ON o.id = c.order_id
    JOIN drivers d ON d.id = c.driver_id
    WHERE c.status IN ('pendente', 'em_tratativa', 'aguardando_motorista', 'respondido')
    ORDER BY c.updated_at DESC
    LIMIT 8
  `);

  return result.rows;
}

export async function searchOrders(term: string): Promise<OrderSummary[]> {
  const normalizedTerm = term.trim();
  if (!normalizedTerm) return [];

  const result = await query<OrderSummary>(
    `
      SELECT
        o.id,
        o.order_number,
        o.driver_id,
        d.name AS driver_name,
        o.created_datetime::text,
        o.delivery_datetime::text,
        o.discount_value::text,
        o.source_file,
        o.source_sheet,
        c.id AS case_id,
        c.status AS case_status,
        c.amount::text AS case_amount,
        c.is_customer_fault
      FROM orders o
      JOIN drivers d ON d.id = o.driver_id
      LEFT JOIN careacao_cases c ON c.order_id = o.id
      WHERE o.order_number ILIKE $1
      ORDER BY o.created_datetime DESC NULLS LAST, o.id DESC
      LIMIT 20
    `,
    [`%${normalizedTerm}%`]
  );

  return result.rows;
}

export async function listCareacaoCases(
  filters: CareacaoFilters & {
    sort?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<CareacaoListResult> {
  const page = Math.max(1, Number(filters.page ?? 1));
  const pageSize = Math.min(100, Math.max(10, Number(filters.pageSize ?? 25)));
  const offset = (page - 1) * pageSize;
  const { where, params } = buildCareacaoWhereClause(filters);
  const orderBy = careacaoOrderBy(filters.sort);

  const totalResult = await query<{ total: string }>(
    `
      SELECT count(*)::text AS total
      FROM careacao_cases c
      JOIN orders o ON o.id = c.order_id
      JOIN drivers d ON d.id = c.driver_id
      ${where}
    `,
    params
  );
  const total = Number(totalResult.rows[0]?.total ?? 0);

  const result = await query<CareacaoCase>(
    `
      SELECT
        c.id,
        c.order_id,
        o.order_number,
        c.driver_id,
        d.name AS driver_name,
        c.status,
        c.amount::text,
        c.is_customer_fault,
        c.fault_reason,
        c.internal_note,
        c.driver_response,
        c.opened_at::text,
        c.updated_at::text,
        c.closed_at::text,
        o.created_datetime::text,
        o.delivery_datetime::text
      FROM careacao_cases c
      JOIN orders o ON o.id = c.order_id
      JOIN drivers d ON d.id = c.driver_id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, pageSize, offset]
  );

  return {
    rows: result.rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getCareacaoCase(id: number): Promise<CareacaoCase | null> {
  const result = await query<CareacaoCase>(
    `
      SELECT
        c.id,
        c.order_id,
        o.order_number,
        c.driver_id,
        d.name AS driver_name,
        c.status,
        c.amount::text,
        c.is_customer_fault,
        c.fault_reason,
        c.internal_note,
        c.driver_response,
        c.opened_at::text,
        c.updated_at::text,
        c.closed_at::text,
        o.created_datetime::text,
        o.delivery_datetime::text
      FROM careacao_cases c
      JOIN orders o ON o.id = c.order_id
      JOIN drivers d ON d.id = c.driver_id
      WHERE c.id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function getCareacaoHistory(careacaoId: number): Promise<CareacaoHistoryRow[]> {
  const result = await query<CareacaoHistoryRow>(
    `
      SELECT
        id,
        careacao_id,
        action,
        previous_status,
        new_status,
        previous_values_json,
        new_values_json,
        actor,
        created_at::text
      FROM careacao_history
      WHERE careacao_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [careacaoId]
  );

  return result.rows;
}

export async function listImportBatches(limit = 20): Promise<ImportBatch[]> {
  const result = await query<ImportBatch>(
    `
      SELECT
        id,
        filename,
        status,
        total_rows,
        imported_rows,
        skipped_rows,
        error_rows,
        started_at::text,
        finished_at::text,
        error_message
      FROM import_batches
      ORDER BY started_at DESC, id DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

export async function getImportBatch(id: number): Promise<ImportBatch | null> {
  const result = await query<ImportBatch>(
    `
      SELECT
        id,
        filename,
        status,
        total_rows,
        imported_rows,
        skipped_rows,
        error_rows,
        started_at::text,
        finished_at::text,
        error_message
      FROM import_batches
      WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function listImportErrors(batchId: number): Promise<ImportErrorRow[]> {
  const result = await query<ImportErrorRow>(
    `
      SELECT
        id,
        row_number,
        raw_data_json,
        error_message,
        created_at::text
      FROM import_errors
      WHERE import_batch_id = $1
      ORDER BY row_number, id
    `,
    [batchId]
  );

  return result.rows;
}
