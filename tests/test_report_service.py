from datetime import datetime, time, timezone
from decimal import Decimal
from pathlib import Path

import pandas as pd
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database.base import Base
from app.models import CareacaoCase, Driver, Order
from app.services.report_service import export_report


@pytest.fixture()
def session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)

    with TestingSession() as session:
        yield session


def test_export_report_creates_excel_with_expected_sheets(session: Session, tmp_path: Path) -> None:
    _seed_orders(session)

    report_path = export_report(session=session, export_dir=tmp_path)

    assert report_path.parent == tmp_path
    assert report_path.name.startswith("relatorio_")
    assert report_path.suffix == ".xlsx"
    assert pd.ExcelFile(report_path).sheet_names == [
        "Pedidos",
        "Resumo por motorista",
        "Pendências",
    ]


@pytest.mark.parametrize(
    ("report_type", "expected_sheets"),
    [
        ("pedidos", ["Pedidos"]),
        ("resumo_motorista", ["Resumo por motorista"]),
        ("pendencias", ["Pendências"]),
    ],
)
def test_export_report_can_generate_specific_report_types(
    session: Session,
    tmp_path: Path,
    report_type: str,
    expected_sheets: list[str],
) -> None:
    _seed_orders(session)

    report_path = export_report(session=session, export_dir=tmp_path, report_type=report_type)

    assert report_type in report_path.name
    assert pd.ExcelFile(report_path).sheet_names == expected_sheets


def test_export_report_rejects_invalid_report_type(session: Session, tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="Tipo de relatorio invalido"):
        export_report(session=session, export_dir=tmp_path, report_type="invalido")


def test_export_report_custom_report_filters_dates_and_fields(session: Session, tmp_path: Path) -> None:
    _seed_orders(session)

    report_path = export_report(
        session=session,
        export_dir=tmp_path,
        report_type="personalizado",
        start_date=datetime(2026, 7, 1).date(),
        end_date=datetime(2026, 7, 1).date(),
        selected_fields=["Número do pedido", "Motorista"],
    )
    dataframe = pd.read_excel(report_path, sheet_name="Personalizado")

    assert dataframe.columns.tolist() == ["Número do pedido", "Motorista"]
    assert set(dataframe["Número do pedido"].astype(str)) == {"1001", "1002", "1003"}


def test_export_report_custom_report_accepts_fields_without_accents(session: Session, tmp_path: Path) -> None:
    _seed_orders(session)

    report_path = export_report(
        session=session,
        export_dir=tmp_path,
        report_type="personalizado",
        selected_fields=["numero do pedido", "data de criacao"],
    )
    dataframe = pd.read_excel(report_path, sheet_name="Personalizado")

    assert dataframe.columns.tolist() == ["Número do pedido", "Data de criação"]


def test_export_report_custom_report_rejects_empty_fields(session: Session, tmp_path: Path) -> None:
    _seed_orders(session)

    with pytest.raises(ValueError, match="Selecione pelo menos um campo valido"):
        export_report(
            session=session,
            export_dir=tmp_path,
            report_type="personalizado",
            selected_fields=["Campo inexistente"],
        )


def test_export_report_orders_sheet_has_expected_columns(session: Session, tmp_path: Path) -> None:
    _seed_orders(session)

    report_path = export_report(session=session, export_dir=tmp_path)
    dataframe = pd.read_excel(report_path, sheet_name="Pedidos")

    assert dataframe.columns.tolist() == [
        "Número do pedido",
        "Motorista",
        "Data de criação",
        "Horário da entrega",
        "Careação",
        "Resolvido",
        "Desconto",
        "Valor desconto",
        "Culpa do cliente",
        "Motivo",
        "Arquivo origem",
        "Aba origem",
    ]
    assert len(dataframe) == 3


def test_export_report_driver_summary_totals(session: Session, tmp_path: Path) -> None:
    _seed_orders(session)

    report_path = export_report(session=session, export_dir=tmp_path)
    dataframe = pd.read_excel(report_path, sheet_name="Resumo por motorista")
    ana = dataframe[dataframe["Motorista"] == "Ana Silva"].iloc[0]

    assert ana["Total de pedidos"] == 2
    assert ana["Total com careação"] == 1
    assert ana["Total resolvido"] == 0
    assert ana["Total com desconto"] == 1
    assert ana["Valor total de desconto"] == 10.5


def test_export_report_pending_orders_filters_expected_rows(session: Session, tmp_path: Path) -> None:
    _seed_orders(session)

    report_path = export_report(session=session, export_dir=tmp_path)
    dataframe = pd.read_excel(report_path, sheet_name="Pendências")

    assert set(dataframe["Número do pedido"].astype(str)) == {"1001"}


def _seed_orders(session: Session) -> None:
    ana = Driver(name="Ana Silva", normalized_name="ANA SILVA")
    bruno = Driver(name="Bruno Souza", normalized_name="BRUNO SOUZA")
    session.add_all([ana, bruno])
    session.flush()

    order_1001 = Order(
        order_number="1001",
        driver_id=ana.id,
        delivery_responsible_raw="Ana Silva",
        delivery_time=time(10, 30),
        created_datetime=datetime(2026, 7, 1, 9, 0, tzinfo=timezone.utc),
        has_careacao=False,
        is_resolved=False,
        has_discount=False,
        discount_value=None,
        source_file="entregas.xlsx",
        source_sheet="Julho",
    )
    order_1002 = Order(
        order_number="1002",
        driver_id=ana.id,
        delivery_responsible_raw="Ana Silva",
        delivery_time=time(11, 30),
        created_datetime=datetime(2026, 7, 1, 10, 0),
        has_careacao=False,
        is_resolved=False,
        has_discount=False,
        discount_value=None,
        source_file="entregas.xlsx",
        source_sheet="Julho",
    )
    order_1003 = Order(
        order_number="1003",
        driver_id=bruno.id,
        delivery_responsible_raw="Bruno Souza",
        delivery_time=time(12, 30),
        created_datetime=datetime(2026, 7, 1, 11, 0),
        has_careacao=False,
        is_resolved=False,
        has_discount=False,
        discount_value=None,
        source_file="entregas.xlsx",
        source_sheet="Julho",
    )
    session.add_all([order_1001, order_1002, order_1003])
    session.flush()
    session.add(
        CareacaoCase(
            order_id=order_1001.id,
            driver_id=ana.id,
            status="pendente",
            amount=Decimal("10.50"),
            is_customer_fault=True,
            fault_reason="Cliente recusou",
        )
    )
    session.commit()
