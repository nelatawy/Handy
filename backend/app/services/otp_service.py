"""otp_service — OTP send/verify + Telegram pre-link (BACKEND_PLAN.md §4)."""

import logging
from datetime import datetime, timedelta

import phonenumbers

from app.extensions import db
from app.models.otp import OtpRateLimit, OtpVerification, TelegramLink
from app.providers import authevo
from app.providers.authevo import ChannelNotLinkedError

logger = logging.getLogger(__name__)

# Exponential backoff for POST /api/otp/send, per phone number: 30s, 60s, 120s, ...
# capped at 1 day. Resets to the initial state once the phone is successfully verified.
RATE_LIMIT_BASE_SECONDS = 30
RATE_LIMIT_MAX_SECONDS = 24 * 60 * 60


def _backoff_seconds(attempt_count: int) -> int:
    """attempt_count is the number of sends so far (1 after the first send).
    Backoff before the 2nd send is the base, doubling after each subsequent send."""
    return min(RATE_LIMIT_BASE_SECONDS * (2 ** (attempt_count - 1)), RATE_LIMIT_MAX_SECONDS)


class OtpServiceError(Exception):
    def __init__(
        self,
        message: str,
        code: str = "bad_request",
        status_code: int = 400,
        retry_after: int | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.retry_after = retry_after


def normalize_phone(raw_phone: str) -> str:
    try:
        parsed = phonenumbers.parse(raw_phone, None)
    except phonenumbers.NumberParseException as exc:
        raise OtpServiceError("Phone number must be in E.164 format, e.g. +201234567890") from exc

    if not phonenumbers.is_valid_number(parsed):
        raise OtpServiceError("Invalid phone number")

    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


def send_otp(raw_phone: str) -> dict:
    phone = normalize_phone(raw_phone)

    rate_limit = OtpRateLimit.query.filter_by(phone_number=phone).first()
    now = datetime.utcnow()
    if rate_limit is not None and rate_limit.locked_until is not None and now < rate_limit.locked_until:
        retry_after = int((rate_limit.locked_until - now).total_seconds())
        raise OtpServiceError(
            f"Too many OTP requests for this phone number, try again in {retry_after}s",
            code="rate_limited",
            status_code=429,
            retry_after=retry_after,
        )

    try:
        result = authevo.send_otp(phone)
    except ChannelNotLinkedError as exc:
        return {"channel": "telegram", "telegramBotUrl": exc.telegram_bot_url, "expiresIn": None}

    otp = OtpVerification(
        phone_number=phone,
        verified=False,
        expires_at=now + timedelta(seconds=result.expires_in),
    )
    db.session.add(otp)

    if rate_limit is None:
        rate_limit = OtpRateLimit(phone_number=phone, attempt_count=0)
        db.session.add(rate_limit)
    rate_limit.attempt_count += 1
    rate_limit.last_sent_at = now
    rate_limit.locked_until = now + timedelta(seconds=_backoff_seconds(rate_limit.attempt_count))

    db.session.commit()

    return {
        "channel": result.channel,
        "telegramBotUrl": result.telegram_bot_url,
        "expiresIn": result.expires_in,
    }


def verify_otp(raw_phone: str, code: str) -> bool:
    phone = normalize_phone(raw_phone)

    otp = (
        OtpVerification.query.filter_by(phone_number=phone, verified=False)
        .order_by(OtpVerification.created_at.desc())
        .first()
    )
    if otp is None or otp.expires_at < datetime.utcnow():
        raise OtpServiceError("No pending OTP for this phone number", code="no_pending_otp")

    verified = authevo.verify_otp(phone, code)
    if not verified:
        return False

    otp.verified = True

    rate_limit = OtpRateLimit.query.filter_by(phone_number=phone).first()
    if rate_limit is not None:
        rate_limit.attempt_count = 0
        rate_limit.locked_until = None

    db.session.commit()

    _ensure_telegram_link(phone)
    return True


def is_phone_verified(raw_phone: str) -> bool:
    phone = normalize_phone(raw_phone)
    return (
        OtpVerification.query.filter_by(phone_number=phone, verified=True)
        .order_by(OtpVerification.created_at.desc())
        .first()
        is not None
    )


def _ensure_telegram_link(phone: str) -> None:
    """Fire-and-forget Telegram pre-link, called right after a phone's first
    successful OTP verification so the fallback is ready before it's needed."""
    try:
        result = authevo.link_telegram(phone)
    except Exception:
        logger.exception("telegram pre-link failed for phone=%s", phone)
        return

    link = TelegramLink.query.filter_by(phone_number=phone).first()
    if link is None:
        link = TelegramLink(phone_number=phone)
        db.session.add(link)
    link.telegram_chat_id = result.telegram_chat_id
    db.session.commit()
