from datetime import datetime
from decimal import Decimal, InvalidOperation
from numbers import Number
import re
import unicodedata

import pandas as pd


TRUE_VALUES = {"SIM", "S", "TRUE", "1"}
FALSE_VALUES = {"NAO", "N", "FALSE", "0"}


def normalize_order_number(value: object) -> str | None:
    if _is_empty(value):
        return None

    if isinstance(value, Number) and not isinstance(value, bool):
        decimal_value = Decimal(str(value))
        return _format_decimal_without_scientific_notation(decimal_value)

    value_text = str(value).strip()

    try:
        decimal_value = Decimal(value_text)
    except InvalidOperation:
        return value_text

    return _format_decimal_without_scientific_notation(decimal_value)


def normalize_driver_name(value: object) -> str | None:
    if _is_empty(value):
        return None

    return _normalize_spaces(str(value))


def normalize_driver_key(value: object) -> str | None:
    driver_name = normalize_driver_name(value)
    if driver_name is None:
        return None

    without_accents = "".join(
        character
        for character in unicodedata.normalize("NFKD", driver_name)
        if not unicodedata.combining(character)
    )

    return _normalize_spaces(without_accents).upper()


def normalize_boolean(value: object) -> bool | None:
    if _is_empty(value):
        return None

    value_text = normalize_driver_key(value)
    if value_text in TRUE_VALUES:
        return True
    if value_text in FALSE_VALUES:
        return False

    raise ValueError(f"Valor booleano invalido: {value}")


def normalize_datetime(value: object) -> datetime | None:
    if _is_empty(value):
        return None

    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()

    if isinstance(value, datetime):
        return value

    if isinstance(value, str):
        parsed_datetime = _parse_common_datetime_string(value)
        if parsed_datetime is not None:
            return parsed_datetime

    parsed_value = pd.to_datetime(value, errors="coerce", dayfirst=True)
    if pd.isna(parsed_value):
        raise ValueError(f"Data/hora invalida: {value}")

    if isinstance(parsed_value, pd.Timestamp):
        return parsed_value.to_pydatetime()

    return parsed_value


def normalize_decimal(value: object) -> Decimal | None:
    if _is_empty(value):
        return None

    if isinstance(value, Decimal):
        return value

    value_text = str(value).strip().replace(",", ".")

    try:
        return Decimal(value_text)
    except InvalidOperation as exc:
        raise ValueError(f"Decimal invalido: {value}") from exc


def _is_empty(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    return bool(pd.isna(value))


def _normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _format_decimal_without_scientific_notation(value: Decimal) -> str:
    plain_value = format(value, "f")
    if "." not in plain_value:
        return plain_value

    return plain_value.rstrip("0").rstrip(".")


def _parse_common_datetime_string(value: str) -> datetime | None:
    value_text = value.strip()

    try:
        return datetime.fromisoformat(value_text)
    except ValueError:
        pass

    for date_format in (
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
    ):
        try:
            return datetime.strptime(value_text, date_format)
        except ValueError:
            continue

    return None
