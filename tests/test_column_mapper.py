import pandas as pd

from app.importers.column_mapper import map_columns


def test_map_columns_renames_known_delivery_columns() -> None:
    dataframe = pd.DataFrame(
        {
            "Número de pedido JMS": ["123"],
            "Responsável pela entrega": ["Ana"],
            "careação?": ["sim"],
            "resolvido?": ["nao"],
            "valor desconto": [10.5],
            "ENTREGADOR": ["Bruno"],
            "DATA INICIO": ["2026-07-01"],
            "DATA FINAL": ["2026-07-02"],
            "DESCONTO": ["sim"],
            "Horário da entrega": ["10:30"],
            "Data de criação": ["2026-07-01"],
            "coluna desconhecida": ["ignorar"],
        }
    )

    mapped_dataframe = map_columns(dataframe)

    assert mapped_dataframe.columns.tolist() == [
        "order_number",
        "driver_name",
        "has_careacao",
        "is_resolved",
        "discount_value",
        "created_datetime",
        "delivery_datetime",
        "has_discount",
        "delivery_time",
    ]


def test_map_columns_ignores_accents_case_extra_spaces_and_simple_punctuation() -> None:
    dataframe = pd.DataFrame(
        {
            "  NÚMERO   DE PEDIDO JMS  ": ["123"],
            "Careação:": ["sim"],
            "RESOLVIDO?": ["nao"],
        }
    )

    mapped_dataframe = map_columns(dataframe)

    assert mapped_dataframe.columns.tolist() == [
        "order_number",
        "has_careacao",
        "is_resolved",
    ]


def test_map_columns_ignores_unknown_columns() -> None:
    dataframe = pd.DataFrame({"sem mapeamento": ["x"]})

    mapped_dataframe = map_columns(dataframe)

    assert mapped_dataframe.empty
    assert mapped_dataframe.columns.tolist() == []
