import uuid
from datetime import datetime, timezone

from sqlalchemy import Enum as SAEnum

from app.extensions import db
from app.models.enums import WorkType


class WorkerProfile(db.Model):
    __tablename__ = "worker_profiles"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), unique=True, nullable=False)

    work_type = db.Column(SAEnum(WorkType, name="work_type", values_callable=lambda x: [e.value for e in x]), nullable=False)
    bio = db.Column(db.Text, nullable=True)
    has_shop = db.Column(db.Boolean, default=False, nullable=False)
    shop_location = db.Column(db.String(255), nullable=True)

    average_rating = db.Column(db.Float, default=0.0, nullable=False)
    ratings_count = db.Column(db.Integer, default=0, nullable=False)
    completed_jobs_count = db.Column(db.Integer, default=0, nullable=False)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="worker_profile")
