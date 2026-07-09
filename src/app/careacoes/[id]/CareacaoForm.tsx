"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateCareacaoAction, type CareacaoActionState } from "../../actions";
import { CAREACAO_STATUSES, statusLabel } from "@/lib/status";

type CareacaoFormItem = {
  id: number;
  status: string;
  amount: string;
  is_customer_fault: boolean | null;
  fault_reason: string | null;
  internal_note: string | null;
  driver_response: string | null;
};

const INITIAL_STATE: CareacaoActionState = { ok: false };

export function CareacaoForm({ item }: { item: CareacaoFormItem }) {
  const [state, formAction] = useActionState(updateCareacaoAction, INITIAL_STATE);
  const [confirmationStatus, setConfirmationStatus] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedSubmit = useRef(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirmedSubmit.current) {
      confirmedSubmit.current = false;
      return;
    }

    const formData = new FormData(event.currentTarget);
    const status = String(formData.get("status") ?? "");
    if ((status === "resolvido" || status === "cancelado") && status !== item.status) {
      event.preventDefault();
      setConfirmationStatus(status);
    }
  }

  function confirmSubmit() {
    confirmedSubmit.current = true;
    setConfirmationStatus(null);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} className="form" action={formAction} onSubmit={handleSubmit}>
        {state.ok && state.message ? <div className="success">{state.message}</div> : null}
        {!state.ok && state.error ? <div className="error">{state.error}</div> : null}
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
            <input
              id="amount"
              name="amount"
              defaultValue={item.amount.replace(".", ",")}
              inputMode="decimal"
              placeholder="0,00 ou 0.00"
            />
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
          <SaveButton />
        </div>
      </form>

      {confirmationStatus ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title">Confirmar alteracao</h2>
            <p>
              Tem certeza que deseja marcar esta careacao como {statusLabel(confirmationStatus).toLowerCase()}?
            </p>
            <div className="actions">
              <button className="button secondary" type="button" onClick={() => setConfirmationStatus(null)}>
                Cancelar
              </button>
              <button className="button" type="button" onClick={confirmSubmit}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          Salvando...
        </>
      ) : (
        "Salvar alteracoes"
      )}
    </button>
  );
}
