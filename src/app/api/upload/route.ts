import { readSession } from "@/lib/auth";
import { importExcelFile } from "@/lib/importer";
import { validateImportFile } from "@/lib/import/import-validator";

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

  if (!(file instanceof File)) {
    return Response.redirect(new URL("/upload?erro=arquivo", request.url), 303);
  }

  const validation = validateImportFile(file.name, file.size);
  if (!validation.ok) {
    return Response.redirect(new URL(`/upload?erro=${validation.code}`, request.url), 303);
  }

  try {
    const result = await importExcelFile(file.name, await file.arrayBuffer());
    return Response.redirect(new URL(`/upload?batch=${result.batchId}`, request.url), 303);
  } catch {
    return Response.redirect(new URL("/upload?erro=processamento", request.url), 303);
  }
}
