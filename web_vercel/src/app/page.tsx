import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getDashboardStats, getRecentOpenCases } from "@/lib/data";
import { formatCurrency, formatDate, faultLabel } from "@/lib/format";
import { statusLabel } from "@/lib/status";

export default async function DashboardPage() {
  await requireSession();

  const [stats, cases] = await Promise.all([getDashboardStats(), getRecentOpenCases()]);

  return (
    <>
      <h1 className="page-title">Resumo</h1>
      <section className="grid stats">
        <div className="card">
          <span>Pedidos</span>
          <strong>{stats.orders_total}</strong>
        </div>
        <div className="card">
          <span>Motoristas</span>
          <strong>{stats.drivers_total}</strong>
        </div>
        <div className="card">
          <span>Careacoes abertas</span>
          <strong>{stats.open_cases_total}</strong>
        </div>
        <div className="card">
          <span>Com valor</span>
          <strong>{stats.cases_with_amount_total}</strong>
        </div>
        <div className="card">
          <span>Valor total</span>
          <strong>{formatCurrency(stats.total_amount)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Pesquisar pedido para careacao</h2>
        </div>
        <div className="card">
          <form className="form" action="/pedidos">
            <div className="field">
              <label htmlFor="pedido">Numero do pedido</label>
              <input id="pedido" name="pedido" placeholder="Digite o numero do pedido" />
            </div>
            <div>
              <button className="button" type="submit">
                Pesquisar
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Careacoes em aberto</h2>
          <Link className="button secondary" href="/careacoes">
            Ver todas
          </Link>
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
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/careacoes/${item.id}`}>{item.order_number}</Link>
                  </td>
                  <td>{item.driver_name}</td>
                  <td>
                    <span className={`badge ${item.status}`}>{statusLabel(item.status)}</span>
                  </td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td>{faultLabel(item.is_customer_fault)}</td>
                  <td>{formatDate(item.updated_at)}</td>
                </tr>
              ))}
              {!cases.length ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Nenhuma careacao aberta.
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
