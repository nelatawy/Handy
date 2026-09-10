import uuid
from datetime import datetime, timezone

from app.extensions import db


class Payout(db.Model):
    __tablename__ = "payouts"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)

    amount = db.Column(db.Numeric(10, 2), nullable=False)
    paymob_reference = db.Column(db.String(80), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
