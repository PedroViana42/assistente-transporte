import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "assistente_transporte_session";

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET nao configurado.");
  }

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string): boolean {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const plainPassword = process.env.ADMIN_PASSWORD;

  if (passwordHash?.startsWith("scrypt$")) {
    const [, salt, expectedHash] = passwordHash.split("$");
    const actual = Buffer.from(scryptSync(password, salt, 64).toString("base64url"));
    const expected = Buffer.from(expectedHash);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  if (passwordHash?.startsWith("scrypt:")) {
    const [, salt, expectedHash] = passwordHash.split(":");
    const actual = Buffer.from(scryptSync(password, salt, 64).toString("base64url"));
    const expected = Buffer.from(expectedHash);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  if (plainPassword) {
    const actual = Buffer.from(password);
    const expected = Buffer.from(plainPassword);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  return false;
}

export function createSession(): string {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12;
  const payload = base64Url(JSON.stringify({ sub: "admin", exp: expiresAt }));
  return `${payload}.${sign(payload)}`;
}

export async function readSession(): Promise<{ sub: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub: string;
      exp: number;
    };
    if (!parsed.sub || parsed.exp < Date.now()) return null;
    return { sub: parsed.sub };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<{ sub: string }> {
  const session = await readSession();
  if (!session) redirect("/login");
  return session;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
