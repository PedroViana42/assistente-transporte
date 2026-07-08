import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listCareacaoCases } from "@/lib/data";
import { formatCurrency, formatDate, faultLabel } from "@/lib/format";
import { CAREACAO_STATUSES, statusLabel } from "@/lib/status";

export default async function CareacoesPage({
  searchParams
}: {
  searchParams: Promise<{
    status?: string;
    motorista?: string;
    inicio?: string;
    fim?: string;
  }>;
}) {
  await requireSession();

  const params = await searchParams;
  const status = params.status ?? "todos";
  const cases = await listCareacaoCases({
    status,
    driver: params.motorista,
    startDate: params.inicio,
    endDate: params.fim
  });

  return (
    <>
      <h1 className="page-title">Careacoes</h1>

      <section className="panel">
        <div className="card">
          <form className="form-grid" action="/careacoes">
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
          <h2>Casos</h2>
          <span className="muted">Mostrando ate 100 registros</span>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>{item.order_number}</td>
                  <td>{item.driver_name}</td>
                  <td>
                    <span className={`badge ${item.status}`}>{statusLabel(item.status)}</span>
                  </td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td>{faultLabel(item.is_customer_fault)}</td>
                  <td>{formatDate(item.opened_at)}</td>
                  <td>
                    <Link className="button secondary" href={`/careacoes/${item.id}`}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {!cases.length ? (
                <tr>
                  <td colSpan={7} className="muted">
                    Nenhuma careacao encontrada.
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
