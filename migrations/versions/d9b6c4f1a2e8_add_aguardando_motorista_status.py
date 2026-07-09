"""add aguardando motorista status

Revision ID: d9b6c4f1a2e8
Revises: c7e9f1a2b3d4
Create Date: 2026-07-09 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "d9b6c4f1a2e8"
down_revision: Union[str, Sequence[str], None] = "c7e9f1a2b3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("alter table careacao_cases drop constraint if exists ck_careacao_cases_status")
    op.execute(
        """
        alter table careacao_cases
          add constraint ck_careacao_cases_status
          check (status in (
            'pendente',
            'em_tratativa',
            'aguardando_motorista',
            'respondido',
            'resolvido',
            'cancelado'
          ))
        """
    )


def downgrade() -> None:
    op.execute("alter table careacao_cases drop constraint if exists ck_careacao_cases_status")
    op.execute(
        """
        alter table careacao_cases
          add constraint ck_careacao_cases_status
          check (status in (
            'pendente',
            'em_tratativa',
            'respondido',
            'resolvido',
            'cancelado'
          ))
        """
    )
