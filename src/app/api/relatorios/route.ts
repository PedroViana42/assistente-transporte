import { readSession } from "@/lib/auth";
import { buildReportWorkbook } from "@/lib/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const session = await readSession();
  if (!session) {
    return new Response("Nao autorizado", { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("tipo") ?? "completo";
  const buffer = await buildReportWorkbook(type, {
    status: url.searchParams.get("status") ?? undefined,
    driver: url.searchParams.get("motorista") ?? undefined,
    startDate: url.searchParams.get("inicio") ?? undefined,
    endDate: url.searchParams.get("fim") ?? undefined,
    order: url.searchParams.get("pedido") ?? undefined
  });
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"relatorio_${type}_${stamp}.xlsx\"`,
      "Cache-Control": "no-store"
    }
  });
}
