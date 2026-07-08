"""sync resolved careacao cases

Revision ID: b1f2d9a4c8e7
Revises: f8c9a21e77b1
Create Date: 2026-07-02 20:15:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "b1f2d9a4c8e7"
down_revision: Union[str, Sequence[str], None] = "f8c9a21e77b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        update careacao_cases
        set status = 'resolvido',
            closed_at = coalesce(closed_at, now()),
            updated_at = now()
        from orders
        where careacao_cases.order_id = orders.id
          and orders.is_resolved is true
          and careacao_cases.status = 'pendente'
          and careacao_cases.internal_note is null
          and careacao_cases.driver_response is null
        """
    )


def downgrade() -> None:
    op.execute(
        """
        update careacao_cases
        set status = 'pendente',
            closed_at = null,
            updated_at = now()
        from orders
        where careacao_cases.order_id = orders.id
          and orders.is_resolved is true
          and careacao_cases.status = 'resolvido'
          and careacao_cases.internal_note is null
          and careacao_cases.driver_response is null
        """
    )
