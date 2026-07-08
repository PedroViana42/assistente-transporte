from pathlib import Path

import pandas as pd
import pytest

from app.importers.excel_reader import list_sheet_names, read_excel_sheets


def test_list_sheet_names_returns_all_tabs(tmp_path: Path) -> None:
    file_path = tmp_path / "entregas.xlsx"

    with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
        pd.DataFrame({"pedido": [1]}).to_excel(writer, sheet_name="Entregas", index=False)
        pd.DataFrame({"pedido": [2]}).to_excel(writer, sheet_name="Resolvidas", index=False)

    assert list_sheet_names(file_path) == ["Entregas", "Resolvidas"]


def test_read_excel_sheets_returns_dataframe_by_non_empty_tab(tmp_path: Path) -> None:
    file_path = tmp_path / "entregas.xlsx"

    entregas = pd.DataFrame(
        {
            "pedido": [1001, None, 1002],
            "motorista": ["Ana", None, "Bruno"],
        }
    )

    with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
        entregas.to_excel(writer, sheet_name="Entregas", index=False)
        pd.DataFrame().to_excel(writer, sheet_name="Vazia", index=False)

    sheets = read_excel_sheets(file_path)

    assert list(sheets.keys()) == ["Entregas"]
    assert len(sheets["Entregas"]) == 2
    assert sheets["Entregas"]["pedido"].tolist() == [1001, 1002]


def test_read_excel_sheets_keeps_sheet_name_as_dict_key(tmp_path: Path) -> None:
    file_path = tmp_path / "entregas.xlsx"

    with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
        pd.DataFrame({"pedido": [1001]}).to_excel(writer, sheet_name="Julho", index=False)

    sheets = read_excel_sheets(file_path)

    assert "Julho" in sheets
    assert isinstance(sheets["Julho"], pd.DataFrame)


def test_read_excel_sheets_rejects_non_xlsx_files(tmp_path: Path) -> None:
    file_path = tmp_path / "entregas.csv"
    file_path.write_text("pedido\n1001\n")

    with pytest.raises(ValueError, match="extensao .xlsx"):
        read_excel_sheets(file_path)
