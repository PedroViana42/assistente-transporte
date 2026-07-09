import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getImportBatch } from "@/lib/data";
import { UploadForm } from "./UploadForm";

export const maxDuration = 60;

export default async function UploadPage({
  searchParams
}: {
  searchParams: Promise<{ batch?: string; erro?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const batch = params.batch ? await getImportBatch(Number(params.batch)) : null;

  return (
    <>
      <h1 className="page-title">Upload de planilha</h1>

      <section className="panel">
        <div className="panel-header">
          <h2>Importar arquivo Excel</h2>
        </div>
        <div className="card">
          <UploadForm error={params.erro} />
        </div>
      </section>

      {batch ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Resultado da importacao</h2>
            <Link className="button secondary" href={`/importacoes?batch=${batch.id}`}>
              Ver erros
            </Link>
          </div>
          <div className="grid stats">
            <div className="card">
              <span>Status</span>
              <strong>{batch.status}</strong>
            </div>
            <div className="card">
              <span>Total</span>
              <strong>{batch.total_rows}</strong>
            </div>
            <div className="card">
              <span>Importados</span>
              <strong>{batch.imported_rows}</strong>
            </div>
            <div className="card">
              <span>Duplicados</span>
              <strong>{batch.skipped_rows}</strong>
            </div>
            <div className="card">
              <span>Erros</span>
              <strong>{batch.error_rows}</strong>
            </div>
          </div>
          {batch.error_message ? <div className="error">{batch.error_message}</div> : null}
        </section>
      ) : null}
    </>
  );
}
