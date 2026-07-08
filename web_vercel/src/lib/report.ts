import ExcelJS from "exceljs";
import { query } from "./db";

type ReportType = "completo" | "pedidos" | "resumo_motorista" | "careacoes";

type ReportRow = Record<string, string | number | boolean | null>;

export async function buildReportWorkbook(reportType: string): Promise<Buffer> {
  const type = normalizeReportType(reportType);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Assistente de Transporte";
  workbook.created = new Date();

  if (type === "completo" || type === "pedidos") {
    addWorksheet(workbook, "Pedidos", await getOrdersRows());
  }

  if (type === "completo" || type === "resumo_motorista") {
    addWorksheet(workbook, "Resumo por motorista", await getDriverSummaryRows());
  }

  if (type === "completo" || type === "careacoes") {
    addWorksheet(workbook, "Careacoes", await getCareacaoRows());
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function normalizeReportType(reportType: string | null | undefined): ReportType {
  if (
    reportType === "pedidos" ||
    reportType === "resumo_motorista" ||
    reportType === "careacoes" ||
    reportType === "completo"
  ) {
    return reportType;
  }
  return "completo";
}

function addWorksheet(workbook: ExcelJS.Workbook, name: string, rows: ReportRow[]): void {
  const worksheet = workbook.addWorksheet(name);
  const columns = rows.length ? Object.keys(rows[0]) : ["Sem dados"];

  worksheet.columns = columns.map((column) => ({
    header: column,
    key: column,
    width: Math.max(14, column.length + 4)
  }));

  if (rows.length) {
    worksheet.addRows(rows);
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

async function getOrdersRows(): Promise<ReportRow[]> {
  const result = await query<ReportRow>(`
    SELECT
      o.order_number AS "Numero do pedido",
      d.name AS "Motorista",
      o.created_datetime::text AS "Data de criacao",
      o.delivery_time::text AS "Horario da entrega",
      CASE WHEN c.id IS NULL THEN false ELSE true END AS "Careacao",
      CASE WHEN c.status = 'resolvido' THEN true ELSE false END AS "Resolvido",
      CASE WHEN c.amount > 0 THEN true ELSE false END AS "Desconto",
      c.amount::text AS "Valor desconto",
      CASE
        WHEN c.is_customer_fault IS TRUE THEN 'Sim'
        WHEN c.is_customer_fault IS FALSE THEN 'Nao'
        ELSE 'Nao definido'
      END AS "Culpa do cliente",
      c.fault_reason AS "Motivo",
      o.source_file AS "Arquivo origem",
      o.source_sheet AS "Aba origem"
    FROM orders o
    JOIN drivers d ON d.id = o.driver_id
    LEFT JOIN careacao_cases c ON c.order_id = o.id
    ORDER BY o.created_datetime DESC NULLS LAST, o.id DESC
  `);

  return result.rows;
}

async function getDriverSummaryRows(): Promise<ReportRow[]> {
  const result = await query<ReportRow>(`
    SELECT
      d.name AS "Motorista",
      count(o.id)::int AS "Total de pedidos",
      sum(CASE WHEN c.id IS NULL THEN 0 ELSE 1 END)::int AS "Total com careacao",
      sum(CASE WHEN c.status = 'resolvido' THEN 1 ELSE 0 END)::int AS "Total resolvido",
      sum(CASE WHEN c.amount > 0 THEN 1 ELSE 0 END)::int AS "Total com desconto",
      coalesce(sum(c.amount), 0)::text AS "Valor total de desconto"
    FROM drivers d
    JOIN orders o ON o.driver_id = d.id
    LEFT JOIN careacao_cases c ON c.order_id = o.id
    GROUP BY d.id, d.name
    ORDER BY d.name
  `);

  return result.rows;
}

async function getCareacaoRows(): Promise<ReportRow[]> {
  const result = await query<ReportRow>(`
    SELECT
      o.order_number AS "Numero do pedido",
      d.name AS "Motorista",
      c.status AS "Status",
      c.amount::text AS "Valor",
      CASE
        WHEN c.is_customer_fault IS TRUE THEN 'Sim'
        WHEN c.is_customer_fault IS FALSE THEN 'Nao'
        ELSE 'Nao definido'
      END AS "Culpa do cliente",
      c.fault_reason AS "Motivo",
      c.internal_note AS "Observacao interna",
      c.driver_response AS "Resposta do motorista",
      c.opened_at::text AS "Aberta em",
      c.updated_at::text AS "Atualizada em",
      c.closed_at::text AS "Fechada em"
    FROM careacao_cases c
    JOIN orders o ON o.id = c.order_id
    JOIN drivers d ON d.id = c.driver_id
    ORDER BY c.updated_at DESC, c.id DESC
  `);

  return result.rows;
}
