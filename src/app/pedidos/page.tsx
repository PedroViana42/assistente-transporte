import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { searchOrders } from "@/lib/data";
import { formatCurrency, formatDate, faultLabel } from "@/lib/format";
import { statusLabel } from "@/lib/status";
import { createCareacaoAction } from "../actions";

export default async function OrdersPage({
  searchParams
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  await requireSession();

  const params = await searchParams;
  const term = params.pedido?.trim() ?? "";
  const orders = await searchOrders(term);

  return (
    <>
      <h1 className="page-title">Pendencias</h1>

      <section className="panel">
        <div className="card">
          <form className="form" action="/pedidos">
            <div className="field">
              <label htmlFor="pedido">Numero do pedido</label>
              <input id="pedido" name="pedido" defaultValue={term} placeholder="Ex: 123456" />
            </div>
            <div>
              <button className="button" type="submit">
                Pesquisar
              </button>
            </div>
          </form>
        </div>
      </section>

      {term ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Pedido encontrado</h2>
            <span className="muted">{orders.length} encontrado(s)</span>
          </div>
          <div className="grid">
            {orders.map((order) => (
              <article className="card" key={order.id}>
                <div className="form-grid">
                  <div>
                    <span className="muted">Pedido</span>
                    <h2>{order.order_number}</h2>
                  </div>
                  <div>
                    <span className="muted">Motorista</span>
                    <h2>{order.driver_name}</h2>
                  </div>
                  <div>
                    <span className="muted">Criado em</span>
                    <h2>{formatDate(order.created_datetime)}</h2>
                  </div>
                </div>

                {order.case_id ? (
                  <div className="actions">
                    <span className={`badge ${order.case_status ?? ""}`}>
                      {statusLabel(order.case_status ?? "")}
                    </span>
                    <span>{formatCurrency(order.case_amount)}</span>
                    <span>{faultLabel(order.is_customer_fault)}</span>
                    <Link className="button secondary" href={`/careacoes/${order.case_id}`}>
                      Editar careacao
                    </Link>
                  </div>
                ) : (
                  <form className="form" action={createCareacaoAction}>
                    <input type="hidden" name="order_id" value={order.id} />
                    <input type="hidden" name="driver_id" value={order.driver_id} />
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor={`amount-${order.id}`}>Valor da careacao</label>
                        <input
                          id={`amount-${order.id}`}
                          name="amount"
                          inputMode="decimal"
                          placeholder="0,00 ou 0.00"
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`fault-${order.id}`}>Foi culpa do cliente?</label>
                        <select id={`fault-${order.id}`} name="is_customer_fault" defaultValue="indefinido">
                          <option value="indefinido">Nao definido</option>
                          <option value="sim">Sim</option>
                          <option value="nao">Nao</option>
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`reason-${order.id}`}>Motivo</label>
                        <input id={`reason-${order.id}`} name="fault_reason" placeholder="Ex: endereco incorreto" />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={`note-${order.id}`}>Observacao interna</label>
                      <textarea id={`note-${order.id}`} name="internal_note" />
                    </div>
                    <div>
                      <button className="button" type="submit">
                        Abrir careacao
                      </button>
                    </div>
                  </form>
                )}
              </article>
            ))}
            {!orders.length ? (
              <div className="card muted">
                Nenhum pedido encontrado para essa busca.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
