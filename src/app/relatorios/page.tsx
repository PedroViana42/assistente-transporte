import { requireSession } from "@/lib/auth";

export default async function RelatoriosPage() {
  await requireSession();

  return (
    <>
      <h1 className="page-title">Relatorios</h1>

      <section className="panel">
        <div className="panel-header">
          <h2>Exportar Excel</h2>
        </div>
        <div className="card">
          <form className="form" action="/api/relatorios" method="GET">
            <div className="field">
              <label htmlFor="tipo">Tipo de relatorio</label>
              <select id="tipo" name="tipo" defaultValue="completo">
                <option value="completo">Completo</option>
                <option value="pedidos">Pedidos</option>
                <option value="resumo_motorista">Resumo por motorista</option>
                <option value="careacoes">Careacoes</option>
              </select>
            </div>
            <div>
              <button className="button" type="submit">
                Gerar relatorio Excel
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
