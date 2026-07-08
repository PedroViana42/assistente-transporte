from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_database_url


engine: Engine | None = None
SessionLocal = sessionmaker(autocommit=False, autoflush=False)


def get_engine() -> Engine:
    global engine

    if engine is None:
        engine = create_engine(get_database_url(), pool_pre_ping=True)
        SessionLocal.configure(bind=engine)

    return engine


@contextmanager
def get_session() -> Iterator[Session]:
    get_engine()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
