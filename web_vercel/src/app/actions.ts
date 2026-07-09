"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearSessionCookie, createSession, requireSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { CAREACAO_STATUSES, isClosedStatus } from "@/lib/status";

function asText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseAmount(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized || 0);
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
  try {
    await client.query("BEGIN");
    await client.query(
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
        ON CONFLICT (order_id) DO UPDATE SET
          amount = EXCLUDED.amount,
          is_customer_fault = EXCLUDED.is_customer_fault,
          fault_reason = EXCLUDED.fault_reason,
          internal_note = EXCLUDED.internal_note,
          updated_at = now()
      `,
      [orderId, driverId, amount, isCustomerFault, faultReason, internalNote]
    );

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
  redirect("/careacoes");
}

export async function updateCareacaoAction(formData: FormData): Promise<void> {
  await requireSession();

  const id = Number(asText(formData.get("id")));
  const status = parseStatus(asText(formData.get("status")));
  const amount = parseAmount(asText(formData.get("amount")));
  const isCustomerFault = parseCustomerFault(asText(formData.get("is_customer_fault")));
  const faultReason = asText(formData.get("fault_reason")) || null;
  const internalNote = asText(formData.get("internal_note")) || null;
  const driverResponse = asText(formData.get("driver_response")) || null;

  if (!id) {
    throw new Error("Careacao invalida.");
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
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
      `,
      [id, status, amount, isCustomerFault, faultReason, internalNote, driverResponse, isClosedStatus(status)]
    );

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
}
