from datetime import date
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory

import pandas as pd
import streamlit as st
from datetime import datetime, timezone

from sqlalchemy import func, select

from app.database.connection import get_session
from app.importers.importer_service import import_excel_file
from app.models import CareacaoCase, Driver, ImportBatch, ImportError, Order
from app.services.report_service import ORDERS_COLUMNS, export_report


st.set_page_config(page_title="Assistente de Transporte", layout="wide")


def main() -> None:
    st.title("Assistente de Transporte")

    page = st.sidebar.radio(
        "Navegacao",
        ["Resumo", "Upload de planilha", "Pendencias", "Importacoes e erros", "Relatorios"],
    )

    if page == "Resumo":
        render_summary_page()
    elif page == "Upload de planilha":
        render_upload_page()
    elif page == "Pendencias":
        render_pending_page()
    elif page == "Importacoes e erros":
        render_import_logs_page()
    else:
        render_reports_page()


def render_summary_page() -> None:
    summary = load_summary()

    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("Pedidos", summary["total_orders"])
    col2.metric("Motoristas", summary["total_drivers"])
    col3.metric("Careacoes pendentes", summary["pending_careacao"])
    col4.metric("Careacoes com valor", summary["cases_with_amount"])
    col5.metric("Valor em careacoes", f"R$ {summary['careacao_amount_sum']:.2f}")


def render_upload_page() -> None:
    uploaded_file = st.file_uploader("Selecione ou arraste uma planilha .xlsx", type=["xlsx"])

    if uploaded_file is None:
        st.info("Escolha um arquivo Excel para iniciar a importacao.")
        return

    if st.button("Importar planilha", type="primary"):
        status_box = st.status("Importando planilha. Aguarde...", expanded=True)
        try:
            status_box.write("Salvando arquivo temporario.")
            with TemporaryDirectory() as temporary_directory:
                temporary_path = Path(temporary_directory) / uploaded_file.name
                temporary_path.write_bytes(uploaded_file.getbuffer())

                status_box.write("Lendo abas, normalizando dados e gravando no Neon.")
                result = import_excel_file(temporary_path)
        except Exception as exc:
            status_box.update(label="Falha na importacao.", state="error")
            st.error(f"Erro ao importar planilha: {exc}")
            return

        status_box.update(label="Importacao finalizada.", state="complete")
        st.success("Importacao finalizada.")
        col1, col2, col3 = st.columns(3)
        col1.metric("Importados", result.imported_rows)
        col2.metric("Duplicados", result.skipped_rows)
        col3.metric("Erros", result.error_rows)
        st.caption(f"Status: {result.status} | Total processado: {result.total_rows}")


def render_pending_page() -> None:
    st.subheader("Abrir careacao por pedido")
    search_term = st.text_input("Pesquisar numero do pedido")

    if search_term.strip():
        search_dataframe = search_orders_for_careacao(search_term)
        if search_dataframe.empty:
            st.info("Nenhum pedido encontrado com esse numero.")
        else:
            st.dataframe(
                search_dataframe.drop(columns=["order_id", "driver_id", "Culpa do cliente raw"], errors="ignore"),
                use_container_width=True,
                hide_index=True,
            )
            render_open_careacao_form(search_dataframe)

    st.divider()
    st.subheader("Careacoes registradas")

    careacao_dataframe = load_careacao_cases()

    if careacao_dataframe.empty:
        st.success("Nenhuma careacao registrada.")
        return

    drivers = ["Todos"] + sorted(careacao_dataframe["Motorista"].dropna().unique().tolist())
    statuses = ["Abertos", "Pendente", "Em tratativa", "Respondido", "Resolvido", "Cancelado", "Todos"]

    col1, col2, col3 = st.columns(3)
    selected_driver = col1.selectbox("Motorista", drivers)
    selected_status = col2.selectbox("Status", statuses)
    selected_date = col3.date_input("Data", value=None)

    filtered_dataframe = filter_pending_dataframe(
        careacao_dataframe,
        selected_driver,
        selected_status,
        selected_date,
    )

    st.dataframe(
        filtered_dataframe.drop(columns=["id", "Culpa do cliente raw"], errors="ignore"),
        use_container_width=True,
        hide_index=True,
    )

    render_careacao_form(filtered_dataframe)


def render_open_careacao_form(search_dataframe: pd.DataFrame) -> None:
    order_options = search_dataframe["Numero do pedido"].astype(str).tolist()
    selected_order_number = st.selectbox("Pedido encontrado", order_options)
    selected_order = search_dataframe[
        search_dataframe["Numero do pedido"].astype(str) == selected_order_number
    ].iloc[0]

    st.caption(f"Motorista: {selected_order['Motorista']}")
    render_careacao_fields(
        form_key=f"open_careacao_{selected_order['order_id']}",
        order_id=int(selected_order["order_id"]),
        status=selected_order.get("Status do caso") or "pendente",
        amount=selected_order.get("Valor careacao"),
        is_customer_fault=selected_order.get("Culpa do cliente raw"),
        fault_reason=selected_order.get("Motivo") or "",
        internal_note=selected_order.get("Observacao interna") or "",
        driver_response=selected_order.get("Resposta do motorista") or "",
        submit_label="Salvar careacao",
    )


def render_careacao_form(filtered_dataframe: pd.DataFrame) -> None:
    if filtered_dataframe.empty:
        st.info("Nenhuma careacao encontrada para os filtros selecionados.")
        return

    st.subheader("Tratamento de careacao")
    order_options = filtered_dataframe["Numero do pedido"].astype(str).tolist()
    selected_order_number = st.selectbox("Pedido", order_options)
    selected_order = filtered_dataframe[
        filtered_dataframe["Numero do pedido"].astype(str) == selected_order_number
    ].iloc[0]

    render_careacao_fields(
        form_key=f"edit_careacao_{selected_order['id']}",
        order_id=int(selected_order["id"]),
        status=selected_order.get("Status do caso") or "pendente",
        amount=selected_order.get("Valor careacao"),
        is_customer_fault=selected_order.get("Culpa do cliente raw"),
        fault_reason=selected_order.get("Motivo") or "",
        internal_note=selected_order.get("Observacao interna") or "",
        driver_response=selected_order.get("Resposta do motorista") or "",
        submit_label="Salvar alteracoes",
    )


def render_careacao_fields(
    form_key: str,
    order_id: int,
    status: str,
    amount: Decimal | float | str | None,
    is_customer_fault: bool | None,
    fault_reason: str,
    internal_note: str,
    driver_response: str,
    submit_label: str,
) -> None:
    with st.form(form_key):
        status_options = ["pendente", "em_tratativa", "respondido", "resolvido", "cancelado"]
        status_value = st.selectbox(
            "Status",
            status_options,
            index=status_options.index(status) if status in status_options else 0,
        )
        amount_value = st.number_input(
            "Valor da careacao",
            min_value=0.0,
            value=amount_to_float(amount),
            step=1.0,
            format="%.2f",
        )
        fault_options = ["Nao definido", "Sim", "Nao"]
        if is_customer_fault is True:
            fault_index = 1
        elif is_customer_fault is False:
            fault_index = 2
        else:
            fault_index = 0
        fault_value = st.selectbox("Foi culpa do cliente?", fault_options, index=fault_index)
        reason_value = st.text_input("Motivo", value=fault_reason or "")
        note_value = st.text_area("Observacao interna", value=internal_note or "")
        driver_response_value = st.text_area("Resposta do motorista", value=driver_response or "")
        submitted = st.form_submit_button(submit_label, type="primary")

    if submitted:
        update_careacao_case(
            order_id,
            status_value,
            amount_value,
            parse_customer_fault(fault_value),
            reason_value,
            note_value,
            driver_response_value,
        )
        st.success("Pedido atualizado com sucesso.")
        st.rerun()


def render_import_logs_page() -> None:
    st.write("Historico das importacoes e erros de linha.")

    batches_dataframe = load_import_batches()
    if batches_dataframe.empty:
        st.info("Nenhuma importacao registrada.")
        return

    st.subheader("Ultimas importacoes")
    st.dataframe(batches_dataframe, use_container_width=True, hide_index=True)

    batch_options = batches_dataframe["id"].tolist()
    selected_batch_id = st.selectbox("Ver erros da importacao", batch_options)
    errors_dataframe = load_import_errors(int(selected_batch_id))

    st.subheader("Erros da importacao selecionada")
    if errors_dataframe.empty:
        st.success("Essa importacao nao possui erros de linha.")
    else:
        st.dataframe(errors_dataframe, use_container_width=True, hide_index=True)


def render_reports_page() -> None:
    st.write("Gere um relatorio Excel escolhendo o conteudo desejado.")

    report_options = {
        "Completo": "completo",
        "Pedidos": "pedidos",
        "Resumo por motorista": "resumo_motorista",
        "Pendencias": "pendencias",
        "Personalizado": "personalizado",
    }
    selected_report = st.selectbox("Tipo de relatorio", list(report_options.keys()))
    start_date = None
    end_date = None
    selected_fields = None

    if report_options[selected_report] == "personalizado":
        col1, col2 = st.columns(2)
        start_date = col1.date_input("Data inicial", value=None)
        end_date = col2.date_input("Data final", value=None)
        selected_fields = st.multiselect(
            "Campos do relatorio",
            ORDERS_COLUMNS,
            default=[
                "Número do pedido",
                "Motorista",
                "Data de criação",
                "Careação",
                "Desconto",
                "Valor desconto",
            ],
        )

    if st.button("Gerar relatorio Excel", type="primary"):
        try:
            report_path = export_report(
                report_type=report_options[selected_report],
                start_date=start_date,
                end_date=end_date,
                selected_fields=selected_fields,
            )
        except Exception as exc:
            st.error(f"Erro ao gerar relatorio: {exc}")
            return

        absolute_report_path = report_path.resolve()
        st.success("Relatorio gerado com sucesso.")
        st.code(str(absolute_report_path))

        with absolute_report_path.open("rb") as report_file:
            st.download_button(
                "Baixar relatorio",
                data=report_file,
                file_name=absolute_report_path.name,
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )


def load_summary() -> dict[str, float]:
    with get_session() as session:
        total_orders = session.scalar(select(func.count()).select_from(Order)) or 0
        total_drivers = session.scalar(select(func.count()).select_from(Driver)) or 0
        pending_careacao = (
            session.scalar(
                select(func.count())
                .select_from(CareacaoCase)
                .where(CareacaoCase.status == "pendente")
            )
            or 0
        )
        cases_with_amount = (
            session.scalar(select(func.count()).select_from(CareacaoCase).where(CareacaoCase.amount > 0)) or 0
        )
        careacao_amount_sum = session.scalar(select(func.coalesce(func.sum(CareacaoCase.amount), 0))) or 0

    return {
        "total_orders": total_orders,
        "total_drivers": total_drivers,
        "pending_careacao": pending_careacao,
        "cases_with_amount": cases_with_amount,
        "careacao_amount_sum": float(careacao_amount_sum),
    }


def load_import_batches(limit: int = 20) -> pd.DataFrame:
    with get_session() as session:
        batches = session.scalars(
            select(ImportBatch).order_by(ImportBatch.id.desc()).limit(limit)
        ).all()

    return pd.DataFrame(
        [
            {
                "id": batch.id,
                "Arquivo": batch.filename,
                "Status": batch.status,
                "Total": batch.total_rows,
                "Importados": batch.imported_rows,
                "Duplicados": batch.skipped_rows,
                "Erros": batch.error_rows,
                "Inicio": batch.started_at,
                "Fim": batch.finished_at,
                "Erro geral": batch.error_message,
            }
            for batch in batches
        ]
    )


def load_import_errors(batch_id: int) -> pd.DataFrame:
    with get_session() as session:
        errors = session.scalars(
            select(ImportError)
            .where(ImportError.import_batch_id == batch_id)
            .order_by(ImportError.row_number)
        ).all()

    rows = []
    for error in errors:
        raw_data = error.raw_data_json or {}
        rows.append(
            {
                "Linha": error.row_number,
                "Aba": raw_data.get("_source_sheet"),
                "Mensagem": error.error_message,
                "Dados": raw_data,
                "Criado em": error.created_at,
            }
        )

    return pd.DataFrame(rows)


def search_orders_for_careacao(search_term: str) -> pd.DataFrame:
    with get_session() as session:
        rows = session.execute(
            select(
                Order.id.label("order_id"),
                Order.driver_id.label("driver_id"),
                Order.order_number.label("Numero do pedido"),
                Driver.name.label("Motorista"),
                Order.created_datetime.label("Data"),
                CareacaoCase.status.label("Status do caso"),
                CareacaoCase.amount.label("Valor careacao"),
                CareacaoCase.is_customer_fault.label("Culpa do cliente raw"),
                CareacaoCase.fault_reason.label("Motivo"),
                CareacaoCase.internal_note.label("Observacao interna"),
                CareacaoCase.driver_response.label("Resposta do motorista"),
            )
            .join(Driver, Order.driver_id == Driver.id)
            .outerjoin(CareacaoCase, CareacaoCase.order_id == Order.id)
            .where(Order.order_number.ilike(f"%{search_term.strip()}%"))
            .order_by(Order.created_datetime.desc().nullslast(), Order.id.desc())
            .limit(20)
        ).mappings().all()

    dataframe = pd.DataFrame(rows)
    if dataframe.empty:
        return dataframe

    dataframe["Data"] = pd.to_datetime(dataframe["Data"], errors="coerce").dt.tz_localize(None)
    dataframe["Culpa do cliente"] = dataframe["Culpa do cliente raw"].apply(format_customer_fault)
    dataframe["Status do caso"] = dataframe["Status do caso"].fillna("sem_careacao")
    return dataframe


def load_careacao_cases() -> pd.DataFrame:
    with get_session() as session:
        rows = session.execute(
            select(
                Order.id.label("id"),
                Order.order_number.label("Numero do pedido"),
                Driver.name.label("Motorista"),
                Order.created_datetime.label("Data"),
                CareacaoCase.status.label("Status do caso"),
                CareacaoCase.amount.label("Valor careacao"),
                CareacaoCase.is_customer_fault.label("Culpa do cliente raw"),
                CareacaoCase.fault_reason.label("Motivo"),
                CareacaoCase.internal_note.label("Observacao interna"),
                CareacaoCase.driver_response.label("Resposta do motorista"),
                CareacaoCase.opened_at.label("Aberta em"),
                CareacaoCase.updated_at.label("Atualizada em"),
            )
            .select_from(CareacaoCase)
            .join(Order, CareacaoCase.order_id == Order.id)
            .join(Driver, CareacaoCase.driver_id == Driver.id)
            .order_by(CareacaoCase.updated_at.desc().nullslast(), CareacaoCase.id.desc())
        ).mappings().all()

    dataframe = pd.DataFrame(rows)
    if dataframe.empty:
        return dataframe

    dataframe["Status"] = dataframe.apply(build_status, axis=1)
    dataframe["Data"] = pd.to_datetime(dataframe["Data"], errors="coerce").dt.tz_localize(None)
    dataframe["Aberta em"] = pd.to_datetime(dataframe["Aberta em"], errors="coerce").dt.tz_localize(None)
    dataframe["Atualizada em"] = pd.to_datetime(dataframe["Atualizada em"], errors="coerce").dt.tz_localize(None)
    dataframe["Culpa do cliente"] = dataframe["Culpa do cliente raw"].apply(format_customer_fault)
    return dataframe


def filter_pending_dataframe(
    dataframe: pd.DataFrame,
    selected_driver: str,
    selected_status: str,
    selected_date: date | None,
) -> pd.DataFrame:
    filtered_dataframe = dataframe.copy()

    if selected_driver != "Todos":
        filtered_dataframe = filtered_dataframe[filtered_dataframe["Motorista"] == selected_driver]

    if selected_status == "Abertos":
        filtered_dataframe = filtered_dataframe[
            filtered_dataframe["Status do caso"].isin(["pendente", "em_tratativa", "respondido"])
        ]
    elif selected_status == "Pendente":
        filtered_dataframe = filtered_dataframe[filtered_dataframe["Status do caso"] == "pendente"]
    elif selected_status == "Em tratativa":
        filtered_dataframe = filtered_dataframe[filtered_dataframe["Status do caso"] == "em_tratativa"]
    elif selected_status == "Respondido":
        filtered_dataframe = filtered_dataframe[filtered_dataframe["Status do caso"] == "respondido"]
    elif selected_status == "Resolvido":
        filtered_dataframe = filtered_dataframe[filtered_dataframe["Status do caso"] == "resolvido"]
    elif selected_status == "Cancelado":
        filtered_dataframe = filtered_dataframe[filtered_dataframe["Status do caso"] == "cancelado"]

    if selected_date is not None:
        filtered_dataframe = filtered_dataframe[filtered_dataframe["Data"].dt.date == selected_date]

    return filtered_dataframe


def build_status(row: pd.Series) -> str:
    labels = {
        "pendente": "Pendente",
        "em_tratativa": "Em tratativa",
        "respondido": "Respondido",
        "resolvido": "Resolvido",
        "cancelado": "Cancelado",
    }
    return labels.get(row.get("Status do caso"), "Sem status")


def format_customer_fault(value: bool | None) -> str:
    if value is True:
        return "Sim"
    if value is False:
        return "Nao"
    return "Nao definido"


def parse_customer_fault(value: str) -> bool | None:
    if value == "Sim":
        return True
    if value == "Nao":
        return False
    return None


def normalize_careacao_amount(value: float | Decimal | str | None) -> Decimal:
    if value in (None, ""):
        return Decimal("0.00")
    return Decimal(str(value)).quantize(Decimal("0.01"))


def amount_to_float(value: Decimal | float | str | None) -> float:
    if value is None or pd.isna(value):
        return 0.0
    return float(value)


def update_careacao_case(
    order_id: int,
    status: str,
    amount: float | Decimal | str,
    is_customer_fault: bool | None,
    fault_reason: str,
    internal_note: str,
    driver_response: str,
) -> None:
    with get_session() as session:
        order = session.get(Order, order_id)
        if order is None:
            raise ValueError("Pedido nao encontrado.")

        careacao_case = session.scalar(select(CareacaoCase).where(CareacaoCase.order_id == order.id))
        if careacao_case is None:
            careacao_case = CareacaoCase(order_id=order.id, driver_id=order.driver_id, status="pendente")
            session.add(careacao_case)

        careacao_case.status = status
        careacao_case.amount = normalize_careacao_amount(amount)
        careacao_case.is_customer_fault = is_customer_fault
        careacao_case.fault_reason = fault_reason.strip() or None
        careacao_case.internal_note = internal_note.strip() or None
        careacao_case.driver_response = driver_response.strip() or None
        careacao_case.closed_at = datetime.now(timezone.utc) if status in {"resolvido", "cancelado"} else None
        order.has_careacao = True
        order.is_resolved = status == "resolvido"
        order.internal_note = careacao_case.internal_note
        session.commit()


if __name__ == "__main__":
    main()
