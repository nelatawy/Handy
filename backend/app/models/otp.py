import uuid
from datetime import datetime, timezone

from app.extensions import db


class OtpVerification(db.Model):
    __tablename__ = "otp_verifications"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = db.Column(db.String(20), nullable=False)  # E.164

    verified = db.Column(db.Boolean, default=False, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index("ix_otp_verifications_phone_number", "phone_number"),
    )


class OtpRateLimit(db.Model):
    """Per-phone exponential backoff state for `POST /api/otp/send` (BACKEND_PLAN.md §12.7)."""

    __tablename__ = "otp_rate_limits"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = db.Column(db.String(20), unique=True, nullable=False)

    attempt_count = db.Column(db.Integer, default=0, nullable=False)
    last_sent_at = db.Column(db.DateTime, nullable=True)
    locked_until = db.Column(db.DateTime, nullable=True)

    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class TelegramLink(db.Model):
    __tablename__ = "telegram_links"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = db.Column(db.String(20), unique=True, nullable=False)
    telegram_chat_id = db.Column(db.String(80), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
