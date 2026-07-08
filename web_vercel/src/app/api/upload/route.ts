import { readSession } from "@/lib/auth";
import { importExcelFile } from "@/lib/importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const session = await readSession();
  if (!session) {
    return Response.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return Response.redirect(new URL("/upload?erro=arquivo", request.url), 303);
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return Response.redirect(new URL("/upload?erro=formato", request.url), 303);
  }

  const result = await importExcelFile(file.name, await file.arrayBuffer());
  return Response.redirect(new URL(`/upload?batch=${result.batchId}`, request.url), 303);
}
