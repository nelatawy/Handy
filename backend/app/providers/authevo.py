"""AuthEvo provider adapter — WhatsApp OTP with Telegram fallback.

All functions honor AUTHEVO_MODE ('mock' | 'sandbox' | 'live'). In 'mock' mode
no network call is made; results are deterministic so the rest of the system
can be built and tested without live credentials.
"""

import logging
from dataclasses import dataclass
from typing import Optional

from flask import current_app

logger = logging.getLogger(__name__)


class ChannelNotLinkedError(Exception):
    """Raised when AuthEvo returns 409 CHANNEL_NOT_LINKED — WhatsApp can't reach the
    number and Telegram isn't linked yet. Callers should surface telegram_bot_url."""

    def __init__(self, telegram_bot_url: str, message: str = "Channel not linked"):
        super().__init__(message)
        self.telegram_bot_url = telegram_bot_url


class AuthEvoError(Exception):
    """Generic error raised for unexpected AuthEvo API failures."""

    def __init__(self, message: str, code: str = "authevo_error", status_code: int = 500):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


@dataclass
class OtpSendResult:
    channel: str  # 'whatsapp' | 'telegram'
    expires_in: int
    telegram_bot_url: Optional[str] = None


@dataclass
class TelegramLinkResult:
    linked: bool
    telegram_chat_id: Optional[str] = None


# ── Internal helpers ──────────────────────────────────────────────────────────

_AUTHEVO_BASE_URL = "https://api.authevo.dev"


def _api_key() -> str:
    key = current_app.config.get("AUTHEVO_API_KEY")
    if not key:
        raise AuthEvoError("AUTHEVO_API_KEY is not configured", code="misconfiguration")
    return key


def _mode() -> str:
    return current_app.config.get("AUTHEVO_MODE", "mock")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {_api_key()}",
        "Content-Type": "application/json",
    }


def _post(path: str, body: dict):
    """Make an authenticated POST to the AuthEvo API. Returns the raw Response object."""
    import requests  # imported lazily — not available in mock mode tests

    url = f"{_AUTHEVO_BASE_URL}{path}"
    logger.debug("[authevo] POST %s body=%s", url, body)

    try:
        resp = requests.post(url, json=body, headers=_headers(), timeout=10)
    except requests.RequestException as exc:
        raise AuthEvoError(f"AuthEvo network error: {exc}") from exc

    if resp.status_code == 401:
        raise AuthEvoError(
            "AuthEvo rejected the API key — check AUTHEVO_API_KEY",
            code="invalid_api_key",
            status_code=401,
        )

    return resp


# ── Public provider functions ─────────────────────────────────────────────────

def send_otp(phone: str) -> OtpSendResult:
    """Send an OTP to the given E.164 phone number via WhatsApp (with Telegram fallback).

    Raises ChannelNotLinkedError when AuthEvo responds with 409 CHANNEL_NOT_LINKED,
    meaning WhatsApp failed and Telegram is not yet linked. The caller should surface
    the telegram_bot_url from the error to the user.
    """
    if _mode() == "mock":
        logger.info("[authevo:mock] send_otp phone=%s", phone)
        return OtpSendResult(channel="whatsapp", expires_in=300)

    resp = _post("/v1/otp/send", {
        "phone": phone,
        "ttl_seconds": 600,
        "code_length": 6,
        "channel_fallback": True,
    })

    if resp.status_code == 409:
        # WhatsApp failed, Telegram not linked — fetch the bot link and bubble up
        error_code = resp.json().get("error", {}).get("code", "")
        if error_code == "CHANNEL_NOT_LINKED":
            try:
                link_resp = _post("/v1/telegram/link", {"phone": phone})
                telegram_bot_url = link_resp.json().get("data", {}).get("telegram_bot_url", "")
            except Exception:
                logger.exception("[authevo] failed to fetch telegram link after CHANNEL_NOT_LINKED")
                telegram_bot_url = ""
            raise ChannelNotLinkedError(telegram_bot_url=telegram_bot_url)

    if not resp.ok:
        error_body = resp.json().get("error", {})
        raise AuthEvoError(
            f"AuthEvo send_otp failed: {error_body.get('message', resp.text)}",
            code=error_body.get("code", "authevo_error"),
            status_code=resp.status_code,
        )

    data = resp.json().get("data", {})
    channel = data.get("channel_used", "whatsapp")

    # Convert expires_at ISO string to seconds remaining
    from datetime import datetime, timezone
    expires_at_str = data.get("expires_at")
    expires_in = 600  # safe default
    if expires_at_str:
        try:
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            expires_in = max(0, int((expires_at - now).total_seconds()))
        except Exception:
            logger.warning("[authevo] could not parse expires_at=%s", expires_at_str)

    return OtpSendResult(channel=channel, expires_in=expires_in)


def verify_otp(phone: str, code: str) -> bool:
    """Verify an OTP code for the given phone number. Returns True if verified."""
    if _mode() == "mock":
        logger.info("[authevo:mock] verify_otp phone=%s code=%s", phone, code)
        return True

    resp = _post("/v1/otp/verify", {"phone": phone, "code": code})

    if resp.status_code == 400:
        error_code = resp.json().get("error", {}).get("code", "")
        if error_code in ("OTP_NOT_FOUND", "VALIDATION_ERROR"):
            # Expired or wrong code — not a hard server error, just return False
            return False

    if resp.status_code == 429:
        raise AuthEvoError(
            "Too many failed verification attempts",
            code="too_many_attempts",
            status_code=429,
        )

    if not resp.ok:
        error_body = resp.json().get("error", {})
        raise AuthEvoError(
            f"AuthEvo verify_otp failed: {error_body.get('message', resp.text)}",
            code=error_body.get("code", "authevo_error"),
            status_code=resp.status_code,
        )

    return resp.json().get("data", {}).get("verified", False)


def link_telegram(phone: str) -> TelegramLinkResult:
    """Generate a Telegram bot link for the given phone number.

    Returns a TelegramLinkResult. AuthEvo's link endpoint returns a bot URL that
    the user must click to connect Telegram. The actual chat_id is only available
    after the user starts the bot (delivered via otp.telegram_linked webhook —
    not yet handled, see BACKEND_PLAN.md §12).
    """
    if _mode() == "mock":
        logger.info("[authevo:mock] link_telegram phone=%s", phone)
        return TelegramLinkResult(linked=True, telegram_chat_id="mock-chat-id")

    resp = _post("/v1/telegram/link", {"phone": phone})

    if not resp.ok:
        error_body = resp.json().get("error", {})
        raise AuthEvoError(
            f"AuthEvo link_telegram failed: {error_body.get('message', resp.text)}",
            code=error_body.get("code", "authevo_error"),
            status_code=resp.status_code,
        )

    # Store the bot URL as the chat_id stand-in until the webhook fires
    telegram_bot_url = resp.json().get("data", {}).get("telegram_bot_url")
    return TelegramLinkResult(linked=True, telegram_chat_id=telegram_bot_url)
