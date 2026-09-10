import uuid
from datetime import datetime, timezone

from sqlalchemy import Enum as SAEnum

from app.extensions import db
from app.models.enums import RequestStatus, WorkType


class Request(db.Model):
    __tablename__ = "requests"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)

    description = db.Column(db.Text, nullable=False)
    work_type = db.Column(SAEnum(WorkType, name="work_type", values_callable=lambda x: [e.value for e in x]), nullable=False)
    status = db.Column(
        SAEnum(RequestStatus, name="request_status", values_callable=lambda x: [e.value for e in x]),
        default=RequestStatus.OPEN,
        nullable=False,
    )

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    images = db.relationship("RequestImage", backref="request", cascade="all, delete-orphan")

    __table_args__ = (
        db.Index("ix_requests_work_type_status", "work_type", "status"),
    )


class RequestImage(db.Model):
    __tablename__ = "request_images"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id = db.Column(db.String(36), db.ForeignKey("requests.id"), nullable=False)
    url = db.Column(db.String(500), nullable=False)
