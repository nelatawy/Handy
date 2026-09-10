import uuid
from datetime import datetime, timezone

from sqlalchemy import Enum as SAEnum

from app.extensions import db
from app.models.enums import OfferStatus


class Offer(db.Model):
    __tablename__ = "offers"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id = db.Column(db.String(36), db.ForeignKey("requests.id"), nullable=False)
    worker_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)

    price = db.Column(db.Numeric(10, 2), nullable=False)
    price_with_fee = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(
        SAEnum(OfferStatus, name="offer_status", values_callable=lambda x: [e.value for e in x]),
        default=OfferStatus.PENDING,
        nullable=False,
    )

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint("request_id", "worker_id", name="uq_offers_request_worker"),
    )
