from datetime import date, datetime, time
from pathlib import Path
import re
import unicodedata

import pandas as pd
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.database.connection import get_session
from app.models import CareacaoCase, Driver, Order


DEFAULT_EXPORT_DIR = Path("data/exportacoes")
REPORT_TYPES = {
    "completo": "completo",
    "pedidos": "pedidos",
    "resumo_motorista": "resumo_motorista",
    "pendencias": "pendencias",
    "personalizado": "personalizado",
}
REPORT_FIELD_OPTIONS = {
    "Número do pedido": "Número do pedido",
    "Motorista": "Motorista",
    "Data de criação": "Data de criação",
    "Horário da entrega": "Horário da entrega",
    "Careação": "Careação",
    "Resolvido": "Resolvido",
    "Desconto": "Desconto",
    "Valor desconto": "Valor desconto",
    "Culpa do cliente": "Culpa do cliente",
    "Motivo": "Motivo",
    "Arquivo origem": "Arquivo origem",
    "Aba origem": "Aba origem",
}
ORDERS_COLUMNS = [
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
DRIVER_SUMMARY_COLUMNS = [
    "Motorista",
    "Total de pedidos",
    "Total com careação",
    "Total resolvido",
    "Total com desconto",
    "Valor total de desconto",
]


def export_report(
    session: Session | None = None,
    export_dir: str | Path = DEFAULT_EXPORT_DIR,
    report_type: str = "completo",
    start_date: date | None = None,
    end_date: date | None = None,
    selected_fields: list[str] | None = None,
) -> Path:
    if session is not None:
        return _export_report(session, Path(export_dir), report_type, start_date, end_date, selected_fields)

    with get_session() as managed_session:
        return _export_report(managed_session, Path(export_dir), report_type, start_date, end_date, selected_fields)


def _export_report(
    session: Session,
    export_dir: Path,
    report_type: str,
    start_date: date | None,
    end_date: date | None,
    selected_fields: list[str] | None,
) -> Path:
    if report_type not in REPORT_TYPES:
        valid_types = ", ".join(REPORT_TYPES)
        raise ValueError(f"Tipo de relatorio invalido. Use um destes: {valid_types}.")

    if report_type == "personalizado":
        selected_fields = _normalize_selected_fields(selected_fields)

    export_dir.mkdir(parents=True, exist_ok=True)
    report_path = export_dir / f"relatorio_{report_type}_{datetime.now():%Y%m%d_%H%M%S}.xlsx"

    with pd.ExcelWriter(report_path, engine="openpyxl") as writer:
        if report_type in {"completo", "pedidos"}:
            _prepare_for_excel(_build_orders_dataframe(session)).to_excel(writer, sheet_name="Pedidos", index=False)

        if report_type in {"completo", "resumo_motorista"}:
            _prepare_for_excel(_build_driver_summary_dataframe(session)).to_excel(
                writer,
                sheet_name="Resumo por motorista",
                index=False,
            )

        if report_type in {"completo", "pendencias"}:
            _prepare_for_excel(_build_pending_orders_dataframe(session)).to_excel(
                writer,
                sheet_name="Pendências",
                index=False,
            )

        if report_type == "personalizado":
            _prepare_for_excel(
                _build_custom_orders_dataframe(session, start_date, end_date, selected_fields)
            ).to_excel(writer, sheet_name="Personalizado", index=False)

    return report_path


def _build_orders_dataframe(session: Session) -> pd.DataFrame:
    rows = session.execute(
        select(
            Order.order_number.label("Número do pedido"),
            Driver.name.label("Motorista"),
            Order.created_datetime.label("Data de criação"),
            Order.delivery_time.label("Horário da entrega"),
            case((CareacaoCase.id.is_not(None), True), else_=False).label("Careação"),
            case((CareacaoCase.status == "resolvido", True), else_=False).label("Resolvido"),
            case((CareacaoCase.amount > 0, True), else_=False).label("Desconto"),
            CareacaoCase.amount.label("Valor desconto"),
            case(
                (CareacaoCase.is_customer_fault.is_(True), "Sim"),
                (CareacaoCase.is_customer_fault.is_(False), "Nao"),
                else_="Nao definido",
            ).label("Culpa do cliente"),
            CareacaoCase.fault_reason.label("Motivo"),
            Order.source_file.label("Arquivo origem"),
            Order.source_sheet.label("Aba origem"),
        )
        .join(Driver, Order.driver_id == Driver.id)
        .outerjoin(CareacaoCase, CareacaoCase.order_id == Order.id)
    ).mappings().all()

    return pd.DataFrame(rows, columns=ORDERS_COLUMNS)


def _build_driver_summary_dataframe(session: Session) -> pd.DataFrame:
    rows = session.execute(
        select(
            Driver.name.label("Motorista"),
            func.count(Order.id).label("Total de pedidos"),
            func.sum(case((CareacaoCase.id.is_not(None), 1), else_=0)).label("Total com careação"),
            func.sum(case((CareacaoCase.status == "resolvido", 1), else_=0)).label("Total resolvido"),
            func.sum(case((CareacaoCase.amount > 0, 1), else_=0)).label("Total com desconto"),
            func.coalesce(func.sum(CareacaoCase.amount), 0).label("Valor total de desconto"),
        )
        .join(Order, Order.driver_id == Driver.id)
        .outerjoin(CareacaoCase, CareacaoCase.order_id == Order.id)
        .group_by(Driver.id, Driver.name)
        .order_by(Driver.name)
    ).mappings().all()

    return pd.DataFrame(rows, columns=DRIVER_SUMMARY_COLUMNS)


def _build_pending_orders_dataframe(session: Session) -> pd.DataFrame:
    rows = session.execute(
        select(
            Order.order_number.label("Número do pedido"),
            Driver.name.label("Motorista"),
            Order.created_datetime.label("Data de criação"),
            Order.delivery_time.label("Horário da entrega"),
            case((CareacaoCase.id.is_not(None), True), else_=False).label("Careação"),
            case((CareacaoCase.status == "resolvido", True), else_=False).label("Resolvido"),
            case((CareacaoCase.amount > 0, True), else_=False).label("Desconto"),
            CareacaoCase.amount.label("Valor desconto"),
            case(
                (CareacaoCase.is_customer_fault.is_(True), "Sim"),
                (CareacaoCase.is_customer_fault.is_(False), "Nao"),
                else_="Nao definido",
            ).label("Culpa do cliente"),
            CareacaoCase.fault_reason.label("Motivo"),
            Order.source_file.label("Arquivo origem"),
            Order.source_sheet.label("Aba origem"),
        )
        .join(Driver, Order.driver_id == Driver.id)
        .join(CareacaoCase, CareacaoCase.order_id == Order.id)
        .where(CareacaoCase.status.in_(["pendente", "em_tratativa", "respondido"]))
    ).mappings().all()

    return pd.DataFrame(rows, columns=ORDERS_COLUMNS)


def _build_custom_orders_dataframe(
    session: Session,
    start_date: date | None,
    end_date: date | None,
    selected_fields: list[str] | None,
) -> pd.DataFrame:
    columns = selected_fields or ORDERS_COLUMNS
    dataframe = _build_orders_dataframe(session)

    if not dataframe.empty:
        dataframe["Data de criação"] = pd.to_datetime(dataframe["Data de criação"], errors="coerce").dt.tz_localize(None)

        if start_date is not None:
            dataframe = dataframe[dataframe["Data de criação"] >= datetime.combine(start_date, time.min)]
        if end_date is not None:
            dataframe = dataframe[dataframe["Data de criação"] <= datetime.combine(end_date, time.max)]

    return dataframe.loc[:, columns]


def _normalize_selected_fields(selected_fields: list[str] | None) -> list[str]:
    if not selected_fields:
        return ORDERS_COLUMNS

    fields_by_normalized_name = {
        _normalize_field_name(field): field
        for field in REPORT_FIELD_OPTIONS
    }
    valid_fields = []
    for field in selected_fields:
        canonical_field = REPORT_FIELD_OPTIONS.get(field)
        if canonical_field is None:
            canonical_field = fields_by_normalized_name.get(_normalize_field_name(field))
        if canonical_field is None:
            canonical_field = fields_by_normalized_name.get(_normalize_field_name(_fix_mojibake(field)))
        if canonical_field is not None:
            valid_fields.append(canonical_field)

    if not valid_fields:
        raise ValueError("Selecione pelo menos um campo valido para o relatorio personalizado.")

    return valid_fields


def _normalize_field_name(field_name: str) -> str:
    without_accents = "".join(
        character
        for character in unicodedata.normalize("NFKD", field_name)
        if not unicodedata.combining(character)
    )
    normalized_spaces = re.sub(r"\s+", " ", without_accents)
    return normalized_spaces.strip().lower()


def _fix_mojibake(value: str) -> str:
    try:
        return value.encode("latin1").decode("utf-8")
    except UnicodeError:
        return value


def _prepare_for_excel(dataframe: pd.DataFrame) -> pd.DataFrame:
    prepared_dataframe = dataframe.copy()

    for column in prepared_dataframe.columns:
        prepared_dataframe[column] = prepared_dataframe[column].map(_make_excel_safe)

    return prepared_dataframe


def _make_excel_safe(value: object) -> object:
    if isinstance(value, datetime) and value.tzinfo is not None:
        return value.replace(tzinfo=None)

    return value
