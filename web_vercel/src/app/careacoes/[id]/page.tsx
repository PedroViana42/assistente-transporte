import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getCareacaoCase } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { CAREACAO_STATUSES, statusLabel } from "@/lib/status";
import { updateCareacaoAction } from "../../actions";

export default async function CareacaoDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();

  const routeParams = await params;
  const item = await getCareacaoCase(Number(routeParams.id));
  if (!item) notFound();

  return (
    <>
      <h1 className="page-title">Careacao do pedido {item.order_number}</h1>

      <section className="panel">
        <div className="card">
          <div className="form-grid">
            <div>
              <span className="muted">Motorista</span>
              <h2>{item.driver_name}</h2>
            </div>
            <div>
              <span className="muted">Aberta em</span>
              <h2>{formatDate(item.opened_at)}</h2>
            </div>
            <div>
              <span className="muted">Atualizada em</span>
              <h2>{formatDate(item.updated_at)}</h2>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Tratamento</h2>
        </div>
        <div className="card">
          <form className="form" action={updateCareacaoAction}>
            <input type="hidden" name="id" value={item.id} />
            <div className="form-grid">
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={item.status}>
                  {CAREACAO_STATUSES.map((status) => (
                    <option value={status} key={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="amount">Valor da careacao</label>
                <input id="amount" name="amount" defaultValue={item.amount.replace(".", ",")} inputMode="decimal" />
              </div>
              <div className="field">
                <label htmlFor="is_customer_fault">Foi culpa do cliente?</label>
                <select
                  id="is_customer_fault"
                  name="is_customer_fault"
                  defaultValue={item.is_customer_fault === true ? "sim" : item.is_customer_fault === false ? "nao" : "indefinido"}
                >
                  <option value="indefinido">Nao definido</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Nao</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="fault_reason">Motivo</label>
              <input id="fault_reason" name="fault_reason" defaultValue={item.fault_reason ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="internal_note">Observacao interna</label>
              <textarea id="internal_note" name="internal_note" defaultValue={item.internal_note ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="driver_response">Resposta do motorista</label>
              <textarea id="driver_response" name="driver_response" defaultValue={item.driver_response ?? ""} />
            </div>
            <div>
              <button className="button" type="submit">
                Salvar alteracoes
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
