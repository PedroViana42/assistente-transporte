import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getCareacaoCase, getCareacaoHistory } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/status";
import { CareacaoForm } from "./CareacaoForm";

export default async function CareacaoDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  await requireSession();

  const routeParams = await params;
  const queryParams = await searchParams;
  const item = await getCareacaoCase(Number(routeParams.id));
  if (!item) notFound();

  const history = await getCareacaoHistory(item.id);
  const returnTo = sanitizeReturnTo(queryParams.returnTo);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Careacao do pedido {item.order_number}</h1>
        <Link className="button secondary" href={returnTo}>
          Voltar
        </Link>
      </div>

      <section className="panel">
        <div className="card">
          <div className="form-grid">
            <div>
              <span className="muted">Motorista</span>
              <h2>{item.driver_name}</h2>
            </div>
            <div>
              <span className="muted">Status atual</span>
              <h2>
                <span className={`badge ${item.status}`}>{statusLabel(item.status)}</span>
              </h2>
            </div>
            <div>
              <span className="muted">Aberta em</span>
              <h2>{formatDate(item.opened_at)}</h2>
            </div>
            <div>
              <span className="muted">Atualizada em</span>
              <h2>{formatDate(item.updated_at)}</h2>
            </div>
            <div>
              <span className="muted">Fechada em</span>
              <h2>{formatDate(item.closed_at)}</h2>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Tratamento</h2>
        </div>
        <div className="card">
          <CareacaoForm item={item} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Historico</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Acao</th>
                <th>Status anterior</th>
                <th>Status novo</th>
                <th>Alteracoes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.created_at)}</td>
                  <td>{formatAction(row.action)}</td>
                  <td>{row.previous_status ? statusLabel(row.previous_status) : "-"}</td>
                  <td>{row.new_status ? statusLabel(row.new_status) : "-"}</td>
                  <td>
                    <code>{JSON.stringify(row.new_values_json ?? {})}</code>
                  </td>
                </tr>
              ))}
              {!history.length ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Nenhuma alteracao registrada ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function sanitizeReturnTo(value?: string): string {
  if (value?.startsWith("/careacoes")) return value;
  return "/careacoes";
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    criacao: "Criacao",
    atualizacao: "Atualizacao",
    mudanca_status: "Mudanca de status",
    resolucao: "Resolucao",
    cancelamento: "Cancelamento",
    reabertura: "Reabertura"
  };
  return labels[action] ?? action;
}
