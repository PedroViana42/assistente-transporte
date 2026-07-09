import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getImportBatch, listImportBatches } from "@/lib/data";
import { formatDate } from "@/lib/format";
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
  const recentBatches = await listImportBatches(8);

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

      <section className="panel">
        <div className="panel-header">
          <h2>Ultimas importacoes</h2>
          <Link className="button secondary" href="/importacoes">
            Ver historico completo
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Data</th>
                <th>Status</th>
                <th>Total</th>
                <th>Importados</th>
                <th>Duplicados</th>
                <th>Erros</th>
                <th>Mensagem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentBatches.map((item) => (
                <tr key={item.id}>
                  <td>{item.filename}</td>
                  <td>{formatDate(item.started_at)}</td>
                  <td>{item.status}</td>
                  <td>{item.total_rows}</td>
                  <td>{item.imported_rows}</td>
                  <td>{item.skipped_rows}</td>
                  <td>{item.error_rows}</td>
                  <td>{item.error_message ?? ""}</td>
                  <td>
                    <Link className="button secondary" href={`/importacoes?batch=${item.id}`}>
                      Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
              {!recentBatches.length ? (
                <tr>
                  <td colSpan={9} className="muted">
                    Nenhuma importacao registrada ainda. Envie uma planilha .xlsx de ate 8 MB para comecar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
