from pathlib import Path

import typer
from sqlalchemy import func, select, text

from app.database.connection import get_session
from app.importers.importer_service import import_excel_file
from app.models import CareacaoCase, Driver, ImportBatch, ImportError, Order
from app.services.report_service import export_report


app = typer.Typer(help="Assistente local para importacao de entregas.")


@app.command("testar-conexao")
def testar_conexao() -> None:
    """Testa a conexao com o banco PostgreSQL."""
    try:
        with get_session() as session:
            session.execute(text("SELECT 1"))
        typer.echo("Conexao com o banco realizada com sucesso.")
    except Exception as exc:
        typer.echo(f"Erro ao conectar ao banco: {exc}", err=True)
        raise typer.Exit(code=1) from exc


@app.command("importar")
def importar(
    arquivo: Path = typer.Argument(..., exists=True, file_okay=True, dir_okay=False, readable=True),
) -> None:
    """Importa um arquivo Excel .xlsx."""
    try:
        result = import_excel_file(arquivo)
    except Exception as exc:
        typer.echo(f"Erro ao importar arquivo: {exc}", err=True)
        raise typer.Exit(code=1) from exc

    _print_import_result(arquivo, result.status, result.total_rows, result.imported_rows, result.skipped_rows, result.error_rows)


@app.command("importar-pasta")
def importar_pasta(
    pasta: Path = typer.Argument(..., exists=True, file_okay=False, dir_okay=True, readable=True),
) -> None:
    """Importa todos os arquivos .xlsx de uma pasta."""
    arquivos = sorted(pasta.glob("*.xlsx"))
    if not arquivos:
        typer.echo(f"Nenhum arquivo .xlsx encontrado em {pasta}.")
        return

    for arquivo in arquivos:
        try:
            result = import_excel_file(arquivo)
            _print_import_result(
                arquivo,
                result.status,
                result.total_rows,
                result.imported_rows,
                result.skipped_rows,
                result.error_rows,
            )
        except Exception as exc:
            typer.echo(f"Erro ao importar {arquivo.name}: {exc}", err=True)


@app.command("resumo")
def resumo() -> None:
    """Mostra um resumo dos dados importados."""
    with get_session() as session:
        total_orders = session.scalar(select(func.count()).select_from(Order)) or 0
        total_drivers = session.scalar(select(func.count()).select_from(Driver)) or 0
        total_with_careacao = session.scalar(select(func.count()).select_from(CareacaoCase)) or 0
        total_resolved = (
            session.scalar(select(func.count()).select_from(CareacaoCase).where(CareacaoCase.status == "resolvido"))
            or 0
        )
        total_with_discount = (
            session.scalar(select(func.count()).select_from(CareacaoCase).where(CareacaoCase.amount > 0)) or 0
        )
        discount_sum = session.scalar(select(func.coalesce(func.sum(CareacaoCase.amount), 0))) or 0

    typer.echo("Resumo geral")
    typer.echo(f"Pedidos: {total_orders}")
    typer.echo(f"Motoristas: {total_drivers}")
    typer.echo(f"Careacoes registradas: {total_with_careacao}")
    typer.echo(f"Careacoes resolvidas: {total_resolved}")
    typer.echo(f"Careacoes com valor: {total_with_discount}")
    typer.echo(f"Soma dos valores: R$ {discount_sum}")


@app.command("listar-importacoes")
def listar_importacoes(
    limite: int = typer.Option(10, "--limite", "-l", min=1, help="Quantidade maxima de importacoes."),
) -> None:
    """Lista as importacoes mais recentes."""
    with get_session() as session:
        batches = session.scalars(
            select(ImportBatch).order_by(ImportBatch.id.desc()).limit(limite)
        ).all()

    if not batches:
        typer.echo("Nenhuma importacao encontrada.")
        return

    for batch in batches:
        typer.echo(
            f"#{batch.id} | {batch.filename} | {batch.status} | "
            f"total={batch.total_rows} importados={batch.imported_rows} "
            f"pulados={batch.skipped_rows} erros={batch.error_rows}"
        )


@app.command("exportar-relatorio")
def exportar_relatorio(
    tipo: str = typer.Option(
        "completo",
        "--tipo",
        "-t",
        help="Tipo: completo, pedidos, resumo_motorista ou pendencias.",
    ),
) -> None:
    """Exporta um relatorio Excel em data/exportacoes."""
    try:
        report_path = export_report(report_type=tipo)
    except Exception as exc:
        typer.echo(f"Erro ao exportar relatorio: {exc}", err=True)
        raise typer.Exit(code=1) from exc

    typer.echo(f"Relatorio exportado com sucesso: {report_path}")


def _print_import_result(
    arquivo: Path,
    status: str,
    total_rows: int,
    imported_rows: int,
    skipped_rows: int,
    error_rows: int,
) -> None:
    typer.echo(
        f"{arquivo.name}: {status} | total={total_rows} "
        f"importados={imported_rows} pulados={skipped_rows} erros={error_rows}"
    )


if __name__ == "__main__":
    app()
