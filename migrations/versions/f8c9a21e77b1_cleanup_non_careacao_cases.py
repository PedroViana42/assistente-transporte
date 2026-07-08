"""cleanup non careacao cases

Revision ID: f8c9a21e77b1
Revises: edc30c9dbb8e
Create Date: 2026-07-02 20:01:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "f8c9a21e77b1"
down_revision: Union[str, Sequence[str], None] = "edc30c9dbb8e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        delete from careacao_cases
        using orders
        where careacao_cases.order_id = orders.id
          and orders.has_careacao is not true
          and coalesce(orders.discount_value, 0) <= 0
          and careacao_cases.status = 'pendente'
          and careacao_cases.internal_note is null
          and careacao_cases.driver_response is null
          and careacao_cases.closed_at is null
        """
    )


def downgrade() -> None:
    op.execute(
        """
        insert into careacao_cases (order_id, driver_id, status, opened_at, updated_at)
        select orders.id, orders.driver_id, 'pendente', now(), now()
        from orders
        left join careacao_cases on careacao_cases.order_id = orders.id
        where careacao_cases.id is null
          and orders.is_resolved is not true
          and orders.has_careacao is not true
          and coalesce(orders.discount_value, 0) <= 0
        """
    )
