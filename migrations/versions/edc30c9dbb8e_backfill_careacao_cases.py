"""backfill careacao cases

Revision ID: edc30c9dbb8e
Revises: d061c1a482e9
Create Date: 2026-07-02 19:52:15.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "edc30c9dbb8e"
down_revision: Union[str, Sequence[str], None] = "d061c1a482e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        insert into careacao_cases (order_id, driver_id, status, opened_at, updated_at)
        select orders.id, orders.driver_id, 'pendente', now(), now()
        from orders
        left join careacao_cases on careacao_cases.order_id = orders.id
        where careacao_cases.id is null
          and (
            orders.has_careacao is true
            or coalesce(orders.discount_value, 0) > 0
          )
        """
    )


def downgrade() -> None:
    op.execute(
        """
        delete from careacao_cases
        where status = 'pendente'
          and internal_note is null
          and driver_response is null
          and closed_at is null
        """
    )
