import uuid
from datetime import datetime, timezone

from sqlalchemy import Enum as SAEnum

from app.extensions import db
from app.models.enums import PaymentMethod, PaymentStatus


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = db.Column(db.String(36), db.ForeignKey("jobs.id"), nullable=False)

    method = db.Column(SAEnum(PaymentMethod, name="payment_method"), nullable=False)
    status = db.Column(
        SAEnum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.PENDING,
        nullable=False,
    )
    amount = db.Column(db.Numeric(10, 2), nullable=False)

    paymob_order_id = db.Column(db.String(80), nullable=True)
    paymob_transaction_id = db.Column(db.String(80), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
