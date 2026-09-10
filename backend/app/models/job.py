import uuid
from datetime import datetime, timezone

from sqlalchemy import Enum as SAEnum

from app.extensions import db
from app.models.enums import CanceledBy, JobStatus, PaymentMethod


class Job(db.Model):
    __tablename__ = "jobs"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id = db.Column(db.String(36), db.ForeignKey("requests.id"), nullable=False)
    offer_id = db.Column(db.String(36), db.ForeignKey("offers.id"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    worker_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)

    status = db.Column(
        SAEnum(JobStatus, name="job_status"),
        default=JobStatus.PENDING,
        nullable=False,
    )
    payment_type = db.Column(SAEnum(PaymentMethod, name="payment_method"), nullable=True)
    canceled_by = db.Column(SAEnum(CanceledBy, name="canceled_by"), nullable=True)

    started_at = db.Column(db.DateTime, nullable=True)
    finished_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        db.Index("ix_jobs_user_id", "user_id"),
        db.Index("ix_jobs_worker_id", "worker_id"),
    )
