from functools import lru_cache
from os import getenv
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv


load_dotenv()


def _ensure_sslmode_require(database_url: str) -> str:
    parsed_url = urlsplit(database_url)

    if not parsed_url.scheme.startswith("postgresql"):
        return database_url

    query_params = dict(parse_qsl(parsed_url.query, keep_blank_values=True))
    query_params.setdefault("sslmode", "require")

    return urlunsplit(
        (
            parsed_url.scheme,
            parsed_url.netloc,
            parsed_url.path,
            urlencode(query_params),
            parsed_url.fragment,
        )
    )


@lru_cache
def get_database_url() -> str:
    database_url = getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL nao configurada no arquivo .env.")

    return _ensure_sslmode_require(database_url)
