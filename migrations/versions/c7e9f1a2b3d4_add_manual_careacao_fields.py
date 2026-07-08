"""add manual careacao fields

Revision ID: c7e9f1a2b3d4
Revises: b1f2d9a4c8e7
Create Date: 2026-07-08 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "c7e9f1a2b3d4"
down_revision: Union[str, Sequence[str], None] = "b1f2d9a4c8e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        alter table careacao_cases
          add column if not exists amount numeric(12, 2) not null default 0,
          add column if not exists is_customer_fault boolean,
          add column if not exists fault_reason text
        """
    )


def downgrade() -> None:
    op.execute("alter table careacao_cases drop column if exists fault_reason")
    op.execute("alter table careacao_cases drop column if exists is_customer_fault")
    op.execute("alter table careacao_cases drop column if exists amount")
