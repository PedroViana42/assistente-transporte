import re
import unicodedata

import pandas as pd


def _normalize_column_name(column_name: str) -> str:
    without_accents = "".join(
        character
        for character in unicodedata.normalize("NFKD", column_name)
        if not unicodedata.combining(character)
    )
    without_punctuation = re.sub(r"[?:.,;!()\[\]{}]", " ", without_accents)
    normalized_spaces = re.sub(r"\s+", " ", without_punctuation)

    return normalized_spaces.strip().lower()


COLUMN_ALIASES = {
    "order_number": {
        "numero de pedido jms",
        "numero pedido jms",
        "pedido",
        "numero pedido",
        "order number",
    },
    "driver_name": {
        "responsavel pela entrega",
        "entregador",
        "motorista",
        "driver",
        "driver name",
    },
    "delivery_time": {
        "horario da entrega",
        "horario entrega",
        "hora da entrega",
        "hora entrega",
        "delivery time",
    },
    "delivery_datetime": {
        "data final",
        "data entrega",
        "delivery datetime",
    },
    "created_datetime": {
        "data inicio",
        "data de criacao",
        "data criacao",
        "created datetime",
    },
    "has_careacao": {
        "careacao",
        "has careacao",
    },
    "is_resolved": {
        "resolvido",
        "resolved",
    },
    "has_discount": {
        "desconto",
        "has discount",
    },
    "discount_value": {
        "valor desconto",
        "discount value",
    },
}

NORMALIZED_COLUMN_ALIASES = {
    _normalize_column_name(alias): canonical_name
    for canonical_name, aliases in COLUMN_ALIASES.items()
    for alias in aliases
}


def map_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    columns_to_keep: list[str] = []
    rename_map: dict[str, str] = {}
    mapped_columns: set[str] = set()

    for column in dataframe.columns:
        canonical_name = NORMALIZED_COLUMN_ALIASES.get(_normalize_column_name(str(column)))
        if canonical_name is None or canonical_name in mapped_columns:
            continue

        columns_to_keep.append(column)
        rename_map[column] = canonical_name
        mapped_columns.add(canonical_name)

    return dataframe.loc[:, columns_to_keep].rename(columns=rename_map)
