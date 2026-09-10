import uuid
from datetime import datetime, timezone

from app.extensions import db


class Rating(db.Model):
    __tablename__ = "ratings"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = db.Column(db.String(36), db.ForeignKey("jobs.id"), unique=True, nullable=False)
    worker_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)

    stars = db.Column(db.SmallInteger, nullable=False)  # 1..5
    comment = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index("ix_ratings_worker_id", "worker_id"),
    )
