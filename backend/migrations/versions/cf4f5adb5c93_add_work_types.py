"""add_work_types

Revision ID: cf4f5adb5c93
Revises: 4b6cd9b5cddc
Create Date: 2026-09-10 22:38:56.638510

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cf4f5adb5c93'
down_revision = '4b6cd9b5cddc'
branch_labels = None
depends_on = None


def upgrade():
    # PostgreSQL requires ADD VALUE to run outside a transaction block.
    op.execute("COMMIT")
    op.execute("ALTER TYPE work_type ADD VALUE 'ac_technician'")
    op.execute("ALTER TYPE work_type ADD VALUE 'painter'")
    op.execute("ALTER TYPE work_type ADD VALUE 'alumetal'")
    op.execute("ALTER TYPE work_type ADD VALUE 'appliance_repair'")
    op.execute("ALTER TYPE work_type ADD VALUE 'satellite'")
    op.execute("ALTER TYPE work_type ADD VALUE 'tiler'")
    op.execute("ALTER TYPE work_type ADD VALUE 'welder'")
    op.execute("ALTER TYPE work_type ADD VALUE 'cleaner'")
    op.execute("ALTER TYPE work_type ADD VALUE 'pest_control'")
    op.execute("ALTER TYPE work_type ADD VALUE 'car_mechanic'")


def downgrade():
    pass
