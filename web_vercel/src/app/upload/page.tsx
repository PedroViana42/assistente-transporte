import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getImportBatch } from "@/lib/data";

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
          <form className="form" action="/api/upload" method="POST" encType="multipart/form-data">
            {params.erro === "arquivo" ? <div className="error">Selecione uma planilha.</div> : null}
            {params.erro === "formato" ? <div className="error">Envie um arquivo .xlsx.</div> : null}
            {params.erro === "tamanho" ? <div className="error">Envie uma planilha de ate 8 MB.</div> : null}
            {params.erro === "processamento" ? (
              <div className="error">Nao foi possivel ler a planilha. Confira se o arquivo nao esta corrompido.</div>
            ) : null}
            <div className="field">
              <label htmlFor="file">Planilha .xlsx</label>
              <input id="file" name="file" type="file" accept=".xlsx" required />
              <span className="muted">Formato aceito: .xlsx ate 8 MB.</span>
            </div>
            <div>
              <button className="button" type="submit">
                Importar planilha
              </button>
            </div>
          </form>
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
