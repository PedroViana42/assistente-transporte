from app.database.base import Base
import app.models  # noqa: F401


def test_models_are_registered_in_metadata() -> None:
    assert sorted(Base.metadata.tables.keys()) == [
        "careacao_cases",
        "drivers",
        "import_batches",
        "import_errors",
        "orders",
    ]
