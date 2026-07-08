from pathlib import Path

import pandas as pd
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.database.base import Base
from app.importers.importer_service import import_excel_file
from app.models import CareacaoCase, Driver, ImportBatch, ImportError, Order


@pytest.fixture()
def session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)

    with TestingSession() as session:
        yield session


def test_import_excel_file_imports_valid_order(session: Session, tmp_path: Path) -> None:
    file_path = _write_excel(
        tmp_path,
        pd.DataFrame(
            {
                "Número de pedido JMS": [1001],
                "Responsável pela entrega": ["Ana Silva"],
                "careação?": ["SIM"],
                "resolvido?": ["NÃO"],
                "valor desconto": ["10,50"],
                "DESCONTO": ["SIM"],
                "DATA INICIO": ["01/07/2026 09:00"],
                "DATA FINAL": ["02/07/2026 10:30"],
            }
        ),
    )

    result = import_excel_file(file_path, session=session)

    order = session.scalar(select(Order).where(Order.order_number == "1001"))
    batch = session.get(ImportBatch, result.batch_id)

    assert result.status == "success"
    assert result.imported_rows == 1
    assert order is not None
    assert order.source_sheet == "Entregas"
    assert order.source_file == "entregas.xlsx"
    assert order.has_careacao is False
    assert order.is_resolved is False
    assert order.has_discount is False
    assert order.discount_value is None
    assert session.scalar(select(CareacaoCase).where(CareacaoCase.order_id == order.id)) is None
    assert batch is not None
    assert batch.filename == "entregas.xlsx"


def test_import_excel_file_creates_driver(session: Session, tmp_path: Path) -> None:
    file_path = _write_excel(
        tmp_path,
        pd.DataFrame(
            {
                "Número de pedido JMS": [1001],
                "Responsável pela entrega": ["  João   Ávila "],
            }
        ),
    )

    import_excel_file(file_path, session=session)

    driver = session.scalar(select(Driver).where(Driver.normalized_name == "JOAO AVILA"))

    assert driver is not None
    assert driver.name == "João Ávila"


def test_import_excel_file_skips_duplicate_order(session: Session, tmp_path: Path) -> None:
    file_path = _write_excel(
        tmp_path,
        pd.DataFrame(
            {
                "Número de pedido JMS": [1001, 1001],
                "Responsável pela entrega": ["Ana Silva", "Ana Silva"],
            }
        ),
    )

    result = import_excel_file(file_path, session=session)
    orders = session.scalars(select(Order)).all()

    assert result.status == "success"
    assert result.imported_rows == 1
    assert result.skipped_rows == 1
    assert len(orders) == 1


def test_import_excel_file_does_not_create_case_for_existing_duplicate_order(
    session: Session,
    tmp_path: Path,
) -> None:
    driver = Driver(name="Ana Silva", normalized_name="ANA SILVA")
    session.add(driver)
    session.flush()
    session.add(
        Order(
            order_number="1001",
            driver_id=driver.id,
            delivery_responsible_raw="Ana Silva",
            has_careacao=True,
            is_resolved=False,
            has_discount=False,
        )
    )
    session.commit()

    file_path = _write_excel(
        tmp_path,
        pd.DataFrame(
            {
                "Número de pedido JMS": [1001],
                "Responsável pela entrega": ["Ana Silva"],
            }
        ),
    )

    result = import_excel_file(file_path, session=session)

    assert result.imported_rows == 0
    assert result.skipped_rows == 1
    assert session.scalar(select(CareacaoCase)) is None


def test_import_excel_file_does_not_create_case_for_resolved_order_without_discount(
    session: Session,
    tmp_path: Path,
) -> None:
    file_path = _write_excel(
        tmp_path,
        pd.DataFrame(
            {
                "Número de pedido JMS": [1001],
                "Responsável pela entrega": ["Ana Silva"],
                "careação?": ["NAO"],
                "resolvido?": ["SIM"],
                "DESCONTO": ["NAO"],
                "valor desconto": [0],
            }
        ),
    )

    result = import_excel_file(file_path, session=session)

    assert result.imported_rows == 1
    assert session.scalar(select(CareacaoCase)) is None


def test_import_excel_file_does_not_create_case_for_unresolved_order_without_careacao_or_discount(
    session: Session,
    tmp_path: Path,
) -> None:
    file_path = _write_excel(
        tmp_path,
        pd.DataFrame(
            {
                "Número de pedido JMS": [1001],
                "Responsável pela entrega": ["Ana Silva"],
                "careação?": ["NAO"],
                "resolvido?": ["NAO"],
                "DESCONTO": ["NAO"],
                "valor desconto": [0],
            }
        ),
    )

    result = import_excel_file(file_path, session=session)

    assert result.imported_rows == 1
    assert session.scalar(select(CareacaoCase)) is None


def test_import_excel_file_does_not_create_case_when_order_is_resolved(
    session: Session,
    tmp_path: Path,
) -> None:
    file_path = _write_excel(
        tmp_path,
        pd.DataFrame(
            {
                "Número de pedido JMS": [1001],
                "Responsável pela entrega": ["Ana Silva"],
                "careação?": ["SIM"],
                "resolvido?": ["SIM"],
            }
        ),
    )

    result = import_excel_file(file_path, session=session)

    assert result.imported_rows == 1
    assert session.scalar(select(CareacaoCase)) is None


def test_import_excel_file_records_invalid_row_error(session: Session, tmp_path: Path) -> None:
    file_path = _write_excel(
        tmp_path,
        pd.DataFrame(
            {
                "Número de pedido JMS": [1001, None],
                "Responsável pela entrega": ["Ana Silva", "Bruno Souza"],
            }
        ),
    )

    result = import_excel_file(file_path, session=session)
    import_error = session.scalar(select(ImportError))

    assert result.status == "partial_success"
    assert result.imported_rows == 1
    assert result.error_rows == 1
    assert import_error is not None
    assert import_error.row_number == 3
    assert "order_number obrigatorio" in import_error.error_message
    assert import_error.raw_data_json["_source_sheet"] == "Entregas"


def test_import_excel_file_ignores_sheet_without_order_number_column(
    session: Session,
    tmp_path: Path,
) -> None:
    file_path = tmp_path / "entregas.xlsx"

    with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
        pd.DataFrame(
            {
                "Número de pedido JMS": [1001],
                "Responsável pela entrega": ["Ana Silva"],
            }
        ).to_excel(writer, sheet_name="Entregas", index=False)
        pd.DataFrame({"Observacao": ["linha auxiliar", "sem pedido"]}).to_excel(
            writer,
            sheet_name="Auxiliar",
            index=False,
        )

    result = import_excel_file(file_path, session=session)

    assert result.status == "success"
    assert result.total_rows == 1
    assert result.imported_rows == 1
    assert result.error_rows == 0


def _write_excel(tmp_path: Path, dataframe: pd.DataFrame) -> Path:
    file_path = tmp_path / "entregas.xlsx"

    with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
        dataframe.to_excel(writer, sheet_name="Entregas", index=False)

    return file_path
