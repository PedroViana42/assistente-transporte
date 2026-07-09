import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listCareacaoCases } from "@/lib/data";
import { formatCurrency, formatDate, faultLabel } from "@/lib/format";
import { CAREACAO_STATUSES, isClosedStatus, statusLabel } from "@/lib/status";

type CareacoesSearchParams = {
  status?: string;
  motorista?: string;
  inicio?: string;
  fim?: string;
  pedido?: string;
  ordem?: string;
  pagina?: string;
};

export default async function CareacoesPage({
  searchParams
}: {
  searchParams: Promise<CareacoesSearchParams>;
}) {
  await requireSession();

  const params = await searchParams;
  const status = params.status ?? "todos";
  const sort = params.ordem ?? "updated_desc";
  const page = Math.max(1, Number(params.pagina ?? 1) || 1);
  const result = await listCareacaoCases({
    status,
    driver: params.motorista,
    startDate: params.inicio,
    endDate: params.fim,
    order: params.pedido,
    sort,
    page
  });
  const currentQuery = buildQuery(params);
  const returnTo = `/careacoes${currentQuery ? `?${currentQuery}` : ""}`;
  const exportQuery = buildQuery({ ...params, pagina: undefined, tipo: "careacoes" });

  return (
    <>
      <h1 className="page-title">Careacoes</h1>

      <section className="panel">
        <div className="card">
          <form className="form-grid" action="/careacoes">
            <div className="field">
              <label htmlFor="pedido">Pedido</label>
              <input id="pedido" name="pedido" defaultValue={params.pedido ?? ""} placeholder="Numero ou parte" />
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={status}>
                <option value="todos">Todos</option>
                {CAREACAO_STATUSES.map((item) => (
                  <option value={item} key={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="motorista">Motorista</label>
              <input id="motorista" name="motorista" defaultValue={params.motorista ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="inicio">Inicio</label>
              <input id="inicio" name="inicio" type="date" defaultValue={params.inicio ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="fim">Fim</label>
              <input id="fim" name="fim" type="date" defaultValue={params.fim ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="ordem">Ordenacao</label>
              <select id="ordem" name="ordem" defaultValue={sort}>
                <option value="updated_desc">Atualizacao mais recente</option>
                <option value="updated_asc">Atualizacao mais antiga</option>
                <option value="opened_desc">Abertura mais recente</option>
                <option value="opened_asc">Abertura mais antiga</option>
              </select>
            </div>
            <div className="actions">
              <button className="button" type="submit">
                Filtrar
              </button>
              <Link className="button secondary" href="/careacoes">
                Limpar
              </Link>
            </div>
          </form>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Casos</h2>
            <span className="muted">
              {result.total} resultado(s), pagina {result.page} de {result.totalPages}
            </span>
          </div>
          <a className="button secondary" href={`/api/relatorios?${exportQuery}`}>
            Exportar filtrado
          </a>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Motorista</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Culpa</th>
                <th>Abertura</th>
                <th>Atualizacao</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((item) => (
                <tr key={item.id} className={isOldOpenCase(item.opened_at, item.status) ? "row-warning" : undefined}>
                  <td>{item.order_number}</td>
                  <td>{item.driver_name}</td>
                  <td>
                    <span className={`badge ${item.status}`}>{statusLabel(item.status)}</span>
                  </td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td>{faultLabel(item.is_customer_fault)}</td>
                  <td>{formatDate(item.opened_at)}</td>
                  <td>{formatDate(item.updated_at)}</td>
                  <td>
                    <Link className="button secondary" href={`/careacoes/${item.id}?returnTo=${encodeURIComponent(returnTo)}`}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {!result.rows.length ? (
                <tr>
                  <td colSpan={8} className="muted">
                    Nenhuma careacao encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          {result.page > 1 ? (
            <Link className="button secondary" href={`/careacoes?${buildQuery({ ...params, pagina: String(result.page - 1) })}`}>
              Anterior
            </Link>
          ) : (
            <span className="button secondary disabled">Anterior</span>
          )}
          <span className="muted">
            Pagina {result.page} de {result.totalPages}
          </span>
          {result.page < result.totalPages ? (
            <Link className="button secondary" href={`/careacoes?${buildQuery({ ...params, pagina: String(result.page + 1) })}`}>
              Proxima
            </Link>
          ) : (
            <span className="button secondary disabled">Proxima</span>
          )}
        </div>
      </section>
    </>
  );
}

function buildQuery(params: CareacoesSearchParams & { tipo?: string }): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return query.toString();
}

function isOldOpenCase(openedAt: string, status: string): boolean {
  if (isClosedStatus(status)) return false;
  const opened = new Date(openedAt).getTime();
  if (Number.isNaN(opened)) return false;
  return Date.now() - opened > 1000 * 60 * 60 * 24 * 7;
}
