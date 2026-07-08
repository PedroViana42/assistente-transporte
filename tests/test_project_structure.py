from pathlib import Path


def test_expected_directories_exist() -> None:
    root = Path(__file__).resolve().parents[1]

    expected_dirs = [
        "app",
        "app/database",
        "app/importers",
        "app/repositories",
        "app/services",
        "app/utils",
        "tests",
        "data/entrada",
        "data/processados",
        "data/erros",
        "data/exportacoes",
        "data/backups",
    ]

    for directory in expected_dirs:
        assert (root / directory).is_dir()
