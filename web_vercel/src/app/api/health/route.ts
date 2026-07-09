import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    await query("select 1");
    return Response.json({
      ok: true,
      database: "ok",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown"
    });
  } catch {
    return Response.json(
      {
        ok: false,
        database: "error",
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown"
      },
      { status: 503 }
    );
  }
}
