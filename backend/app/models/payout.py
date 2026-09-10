import uuid
from datetime import datetime, timezone

from sqlalchemy import Enum as SAEnum

from app.extensions import db
from app.models.enums import PaymentStatus


class Payout(db.Model):
    __tablename__ = "payouts"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    job_id = db.Column(db.String(36), db.ForeignKey("jobs.id"), nullable=True)

    amount = db.Column(db.Numeric(10, 2), nullable=False)
    paymob_reference = db.Column(db.String(80), nullable=True)
    status = db.Column(
        SAEnum(PaymentStatus, name="payment_status", values_callable=lambda x: [e.value for e in x]),
        default=PaymentStatus.PENDING,
        nullable=False,
    )

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
