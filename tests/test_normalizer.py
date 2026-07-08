from datetime import datetime
from decimal import Decimal

import pandas as pd
import pytest

from app.importers.normalizer import (
    normalize_boolean,
    normalize_datetime,
    normalize_decimal,
    normalize_driver_key,
    normalize_driver_name,
    normalize_order_number,
)


def test_normalize_order_number_returns_string_without_scientific_notation() -> None:
    assert normalize_order_number(1.234e5) == "123400"
    assert normalize_order_number(1234.0) == "1234"
    assert normalize_order_number("1E+6") == "1000000"


def test_normalize_order_number_empty_values_return_none() -> None:
    assert normalize_order_number(None) is None
    assert normalize_order_number("") is None
    assert normalize_order_number(pd.NA) is None


def test_normalize_driver_name_removes_duplicate_spaces() -> None:
    assert normalize_driver_name("  Ana   Maria  Silva ") == "Ana Maria Silva"


def test_normalize_driver_key_removes_accents_uppercases_and_normalizes_spaces() -> None:
    assert normalize_driver_key("  João   da  Silva ") == "JOAO DA SILVA"


@pytest.mark.parametrize("value", ["SIM", "S", "TRUE", "1", 1, " sim "])
def test_normalize_boolean_true_values(value: object) -> None:
    assert normalize_boolean(value) is True


@pytest.mark.parametrize("value", ["NÃO", "NAO", "N", "FALSE", "0", 0, " não "])
def test_normalize_boolean_false_values(value: object) -> None:
    assert normalize_boolean(value) is False


def test_normalize_boolean_empty_values_return_none() -> None:
    assert normalize_boolean(None) is None
    assert normalize_boolean("") is None


def test_normalize_boolean_rejects_unknown_values() -> None:
    with pytest.raises(ValueError, match="booleano invalido"):
        normalize_boolean("talvez")


def test_normalize_datetime_accepts_datetime_pandas_and_string_values() -> None:
    expected = datetime(2026, 7, 2, 14, 30)

    assert normalize_datetime(expected) == expected
    assert normalize_datetime(pd.Timestamp(expected)) == expected
    assert normalize_datetime("02/07/2026 14:30") == expected


def test_normalize_datetime_empty_values_return_none() -> None:
    assert normalize_datetime(None) is None
    assert normalize_datetime("") is None


def test_normalize_decimal_accepts_comma_or_point() -> None:
    assert normalize_decimal("10,50") == Decimal("10.50")
    assert normalize_decimal("10.50") == Decimal("10.50")
    assert normalize_decimal(10.5) == Decimal("10.5")


def test_normalize_decimal_empty_values_return_none() -> None:
    assert normalize_decimal(None) is None
    assert normalize_decimal("") is None
