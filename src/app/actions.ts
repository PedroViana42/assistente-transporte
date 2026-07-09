"use server";

import type { PoolClient } from "pg";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearSessionCookie, createSession, requireSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { normalizeDecimal } from "@/lib/import/normalizers";
import { CAREACAO_STATUSES, isClosedStatus } from "@/lib/status";

export type CareacaoActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

type CareacaoSnapshot = {
  id: number;
  order_id: number;
  driver_id: number;
  status: string;
  amount: string;
  is_customer_fault: boolean | null;
  fault_reason: string | null;
  internal_note: string | null;
  driver_response: string | null;
};

function asText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseAmount(value: string): number {
  const normalized = normalizeDecimal(value) ?? "0";
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Valor da careacao invalido.");
  }
  return amount;
}

function parseCustomerFault(value: string): boolean | null {
  if (value === "sim") return true;
  if (value === "nao") return false;
  return null;
}

function parseStatus(value: string): string {
  if ((CAREACAO_STATUSES as readonly string[]).includes(value)) return value;
  throw new Error("Status da careacao invalido.");
}

export async function loginAction(formData: FormData): Promise<void> {
  const password = asText(formData.get("password"));

  if (!verifyPassword(password)) {
    redirect("/login?erro=1");
  }

  await setSessionCookie(createSession());
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

export async function createCareacaoAction(formData: FormData): Promise<void> {
  await requireSession();

  const orderId = Number(asText(formData.get("order_id")));
  const driverId = Number(asText(formData.get("driver_id")));
  const amount = parseAmount(asText(formData.get("amount")));
  const isCustomerFault = parseCustomerFault(asText(formData.get("is_customer_fault")));
  const faultReason = asText(formData.get("fault_reason")) || null;
  const internalNote = asText(formData.get("internal_note")) || null;

  if (!orderId || !driverId) {
    throw new Error("Pedido invalido.");
  }

  const client = await getPool().connect();
  let careacaoId: number | null = null;
  try {
    await client.query("BEGIN");

    const existing = await client.query<CareacaoSnapshot>(
      `
        SELECT
          id,
          order_id,
          driver_id,
          status,
          amount::text,
          is_customer_fault,
          fault_reason,
          internal_note,
          driver_response
        FROM careacao_cases
        WHERE order_id = $1
        FOR UPDATE
      `,
      [orderId]
    );

    const previous = existing.rows[0] ?? null;
    const saved = previous
      ? await client.query<CareacaoSnapshot>(
          `
            UPDATE careacao_cases
            SET
              amount = $2,
              is_customer_fault = $3,
              fault_reason = $4,
              internal_note = $5,
              updated_at = now()
            WHERE id = $1
            RETURNING
              id,
              order_id,
              driver_id,
              status,
              amount::text,
              is_customer_fault,
              fault_reason,
              internal_note,
              driver_response
          `,
          [previous.id, amount, isCustomerFault, faultReason, internalNote]
        )
      : await client.query<CareacaoSnapshot>(
          `
            INSERT INTO careacao_cases (
              order_id,
              driver_id,
              status,
              amount,
              is_customer_fault,
              fault_reason,
              internal_note,
              opened_at,
              updated_at
            )
            VALUES ($1, $2, 'pendente', $3, $4, $5, $6, now(), now())
            RETURNING
              id,
              order_id,
              driver_id,
              status,
              amount::text,
              is_customer_fault,
              fault_reason,
              internal_note,
              driver_response
          `,
          [orderId, driverId, amount, isCustomerFault, faultReason, internalNote]
        );

    const current = saved.rows[0];
    careacaoId = current.id;
    await syncOrderFromCareacao(client, current);
    await recordCareacaoHistory(client, previous, current);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/careacoes");
  redirect(careacaoId ? `/careacoes/${careacaoId}` : "/careacoes");
}

export async function updateCareacaoAction(
  _previousState: CareacaoActionState,
  formData: FormData
): Promise<CareacaoActionState> {
  try {
    await requireSession();

    const id = Number(asText(formData.get("id")));
    const status = parseStatus(asText(formData.get("status")));
    const amount = parseAmount(asText(formData.get("amount")));
    const isCustomerFault = parseCustomerFault(asText(formData.get("is_customer_fault")));
    const faultReason = asText(formData.get("fault_reason")) || null;
    const internalNote = asText(formData.get("internal_note")) || null;
    const driverResponse = asText(formData.get("driver_response")) || null;

    if (!id) {
      return { ok: false, error: "Careacao invalida." };
    }

    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const previousResult = await client.query<CareacaoSnapshot>(
        `
          SELECT
            id,
            order_id,
            driver_id,
            status,
            amount::text,
            is_customer_fault,
            fault_reason,
            internal_note,
            driver_response
          FROM careacao_cases
          WHERE id = $1
          FOR UPDATE
        `,
        [id]
      );
      const previous = previousResult.rows[0] ?? null;
      if (!previous) {
        await client.query("ROLLBACK");
        return { ok: false, error: "Careacao nao encontrada." };
      }

      const saved = await client.query<CareacaoSnapshot>(
        `
          UPDATE careacao_cases
          SET
            status = $2,
            amount = $3,
            is_customer_fault = $4,
            fault_reason = $5,
            internal_note = $6,
            driver_response = $7,
            updated_at = now(),
            closed_at = CASE WHEN $8 THEN COALESCE(closed_at, now()) ELSE NULL END
          WHERE id = $1
          RETURNING
            id,
            order_id,
            driver_id,
            status,
            amount::text,
            is_customer_fault,
            fault_reason,
            internal_note,
            driver_response
        `,
        [id, status, amount, isCustomerFault, faultReason, internalNote, driverResponse, isClosedStatus(status)]
      );
      const current = saved.rows[0];

      await syncOrderFromCareacao(client, current);
      await recordCareacaoHistory(client, previous, current);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    revalidatePath("/");
    revalidatePath("/careacoes");
    revalidatePath(`/careacoes/${id}`);
    return { ok: true, message: "Alteracoes salvas com sucesso." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Nao foi possivel salvar a careacao."
    };
  }
}

async function syncOrderFromCareacao(client: PoolClient, current: CareacaoSnapshot): Promise<void> {
  const amount = Number(current.amount);
  await client.query(
    `
      UPDATE orders
      SET
        has_careacao = true,
        is_resolved = $2,
        has_discount = $3,
        discount_value = CASE WHEN $3 THEN $4::numeric ELSE NULL END,
        internal_note = $5,
        updated_at = now()
      WHERE id = $1
    `,
    [
      current.order_id,
      current.status === "resolvido",
      Number.isFinite(amount) && amount > 0,
      current.amount,
      current.internal_note
    ]
  );
}

async function recordCareacaoHistory(
  client: PoolClient,
  previous: CareacaoSnapshot | null,
  current: CareacaoSnapshot
): Promise<void> {
  await client.query(
    `
      INSERT INTO careacao_history (
        careacao_id,
        action,
        previous_status,
        new_status,
        previous_values_json,
        new_values_json,
        actor,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, 'admin', now())
    `,
    [
      current.id,
      historyAction(previous?.status ?? null, current.status),
      previous?.status ?? null,
      current.status,
      previous ? JSON.stringify(snapshotValues(previous)) : null,
      JSON.stringify(snapshotValues(current))
    ]
  );
}

function snapshotValues(snapshot: CareacaoSnapshot): Record<string, unknown> {
  return {
    amount: snapshot.amount,
    is_customer_fault: snapshot.is_customer_fault,
    fault_reason: snapshot.fault_reason,
    internal_note: snapshot.internal_note,
    driver_response: snapshot.driver_response
  };
}

function historyAction(previousStatus: string | null, newStatus: string): string {
  if (!previousStatus) return "criacao";
  if (previousStatus === newStatus) return "atualizacao";
  if (newStatus === "resolvido") return "resolucao";
  if (newStatus === "cancelado") return "cancelamento";
  if (isClosedStatus(previousStatus) && !isClosedStatus(newStatus)) return "reabertura";
  return "mudanca_status";
}
