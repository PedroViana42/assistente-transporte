import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listImportBatches, listImportErrors } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default async function ImportacoesPage({
  searchParams
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const batches = await listImportBatches();
  const selectedBatchId = Number(params.batch ?? batches[0]?.id ?? 0);
  const errors = selectedBatchId ? await listImportErrors(selectedBatchId) : [];

  return (
    <>
      <h1 className="page-title">Importacoes e erros</h1>

      <section className="panel">
        <div className="panel-header">
          <h2>Ultimas importacoes</h2>
          <Link className="button secondary" href="/upload">
            Nova importacao
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Arquivo</th>
                <th>Status</th>
                <th>Total</th>
                <th>Importados</th>
                <th>Duplicados</th>
                <th>Erros</th>
                <th>Inicio</th>
                <th>Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td>
                    <Link href={`/importacoes?batch=${batch.id}`}>{batch.id}</Link>
                  </td>
                  <td>{batch.filename}</td>
                  <td>{batch.status}</td>
                  <td>{batch.total_rows}</td>
                  <td>{batch.imported_rows}</td>
                  <td>{batch.skipped_rows}</td>
                  <td>{batch.error_rows}</td>
                  <td>{formatDate(batch.started_at)}</td>
                  <td>{batch.error_message ?? ""}</td>
                </tr>
              ))}
              {!batches.length ? (
                <tr>
                  <td colSpan={9} className="muted">
                    Nenhuma importacao registrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Erros da importacao {selectedBatchId || ""}</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Linha</th>
                <th>Mensagem</th>
                <th>Dados</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((error) => (
                <tr key={error.id}>
                  <td>{error.row_number}</td>
                  <td>{error.error_message}</td>
                  <td>
                    <code>{JSON.stringify(error.raw_data_json)}</code>
                  </td>
                  <td>{formatDate(error.created_at)}</td>
                </tr>
              ))}
              {!errors.length ? (
                <tr>
                  <td colSpan={4} className="muted">
                    Sem erros para exibir.
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
