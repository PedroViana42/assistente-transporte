from dataclasses import dataclass
from datetime import datetime, time, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

import pandas as pd
from psycopg2.extras import execute_values
from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from app.database.connection import get_session
from app.importers.column_mapper import map_columns
from app.importers.excel_reader import read_excel_sheets
from app.importers.normalizer import (
    normalize_datetime,
    normalize_driver_key,
    normalize_driver_name,
    normalize_order_number,
)
from app.models import Driver, ImportBatch, ImportError as ImportErrorModel, Order


@dataclass(frozen=True)
class ImportResult:
    batch_id: int
    status: str
    total_rows: int
    imported_rows: int
    skipped_rows: int
    error_rows: int


def import_excel_file(file_path: str | Path, session: Session | None = None) -> ImportResult:
    if session is not None:
        return _import_excel_file(file_path, session)

    with get_session() as managed_session:
        return _import_excel_file(file_path, managed_session)


def _import_excel_file(file_path: str | Path, session: Session) -> ImportResult:
    path = Path(file_path)
    existing_orders_by_number = {
        order.order_number: order
        for order in session.scalars(select(Order)).all()
    }
    drivers_by_key = {
        driver.normalized_name: driver
        for driver in session.scalars(select(Driver)).all()
    }
    batch = ImportBatch(
        filename=path.name,
        status="running",
        total_rows=0,
        imported_rows=0,
        skipped_rows=0,
        error_rows=0,
    )
    session.add(batch)
    session.flush()

    try:
        sheets = read_excel_sheets(path)

        for sheet_name, dataframe in sheets.items():
            mapped_dataframe = map_columns(dataframe)
            if "order_number" not in mapped_dataframe.columns:
                continue

            batch.total_rows += len(mapped_dataframe)
            order_mappings: list[dict[str, Any]] = []

            for row_number, (_, row) in enumerate(mapped_dataframe.iterrows(), start=2):
                try:
                    order_mapping = _build_order_mapping(
                        session,
                        row,
                        existing_orders_by_number,
                        drivers_by_key,
                        sheet_name,
                        path.name,
                    )
                    order_mappings.append(order_mapping)
                    batch.imported_rows += 1
                except DuplicateOrderError:
                    batch.skipped_rows += 1
                except Exception as exc:
                    batch.error_rows += 1
                    session.add(
                        ImportErrorModel(
                            import_batch_id=batch.id,
                            row_number=row_number,
                            raw_data_json=_row_to_json(row, sheet_name),
                            error_message=str(exc),
                        )
                    )

            _insert_order_mappings(session, order_mappings)

        batch.status = "partial_success" if batch.error_rows else "success"
        batch.finished_at = datetime.now(timezone.utc)
        session.commit()
    except Exception as exc:
        session.rollback()
        batch.status = "failed"
        batch.finished_at = datetime.now(timezone.utc)
        batch.error_message = str(exc)
        session.add(batch)
        session.commit()

    return ImportResult(
        batch_id=batch.id,
        status=batch.status,
        total_rows=batch.total_rows,
        imported_rows=batch.imported_rows,
        skipped_rows=batch.skipped_rows,
        error_rows=batch.error_rows,
    )


class DuplicateOrderError(Exception):
    pass


def _build_order_mapping(
    session: Session,
    row: pd.Series,
    existing_orders_by_number: dict[str, Order],
    drivers_by_key: dict[str, Driver],
    source_sheet: str,
    source_file: str,
) -> dict[str, Any]:
    order_number = normalize_order_number(row.get("order_number"))
    if order_number is None:
        raise ValueError("order_number obrigatorio.")

    existing_order = existing_orders_by_number.get(order_number)
    if existing_order is not None:
        raise DuplicateOrderError()

    driver_name = normalize_driver_name(row.get("driver_name"))
    normalized_driver_name = normalize_driver_key(driver_name)
    if driver_name is None or normalized_driver_name is None:
        raise ValueError("driver_name obrigatorio.")

    delivery_time = _normalize_time(row.get("delivery_time"))
    delivery_datetime = normalize_datetime(row.get("delivery_datetime"))
    created_datetime = normalize_datetime(row.get("created_datetime"))
    # Careacao/desconto sao preenchidos manualmente no painel depois da busca do pedido.
    # A planilha entra apenas como base de pedidos, motoristas e datas.
    has_careacao = False
    is_resolved = False
    has_discount = False
    discount_value = None

    driver = drivers_by_key.get(normalized_driver_name)
    if driver is None:
        driver = Driver(name=driver_name, normalized_name=normalized_driver_name)
        session.add(driver)
        session.flush()
        drivers_by_key[normalized_driver_name] = driver

    order_mapping = {
        "order_number": order_number,
        "driver_id": driver.id,
        "delivery_responsible_raw": driver_name,
        "delivery_time": delivery_time,
        "delivery_datetime": delivery_datetime,
        "created_datetime": created_datetime,
        "has_careacao": has_careacao,
        "is_resolved": is_resolved,
        "has_discount": has_discount,
        "discount_value": discount_value,
        "source_sheet": source_sheet,
        "source_file": source_file,
    }
    existing_orders_by_number[order_number] = Order(**order_mapping)

    return order_mapping


def _insert_order_mappings(session: Session, order_mappings: list[dict[str, Any]]) -> None:
    if not order_mappings:
        return

    if session.bind is not None and session.bind.dialect.name == "postgresql":
        _insert_order_mappings_postgresql(session, order_mappings)
        return

    chunk_size = 5000
    for index in range(0, len(order_mappings), chunk_size):
        session.execute(insert(Order), order_mappings[index : index + chunk_size])
    session.flush()


def _insert_order_mappings_postgresql(session: Session, order_mappings: list[dict[str, Any]]) -> None:
    columns = [
        "order_number",
        "driver_id",
        "delivery_responsible_raw",
        "delivery_time",
        "delivery_datetime",
        "created_datetime",
        "has_careacao",
        "is_resolved",
        "has_discount",
        "discount_value",
        "source_sheet",
        "source_file",
    ]
    values = [tuple(order_mapping.get(column) for column in columns) for order_mapping in order_mappings]
    sql = f"insert into orders ({', '.join(columns)}) values %s"

    raw_connection = session.connection().connection.driver_connection
    with raw_connection.cursor() as cursor:
        execute_values(cursor, sql, values, page_size=10000)


def _normalize_time(value: object) -> time | None:
    if value is None or (isinstance(value, str) and value.strip() == "") or pd.isna(value):
        return None
    if isinstance(value, time):
        return value
    if isinstance(value, datetime):
        return value.time()

    parsed_value = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed_value):
        raise ValueError(f"Horario invalido: {value}")

    return parsed_value.time()


def _row_to_json(row: pd.Series, source_sheet: str | None = None) -> dict[str, Any]:
    raw_data = {str(column): _json_safe(value) for column, value in row.to_dict().items()}
    if source_sheet is not None:
        raw_data["_source_sheet"] = source_sheet

    return raw_data


def _json_safe(value: object) -> Any:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, (datetime, time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if hasattr(value, "item"):
        return value.item()
    return value
