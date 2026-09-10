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


@dataclass
class OtpSendResult:
    channel: str  # 'whatsapp' | 'telegram'
    expires_in: int
    telegram_bot_url: Optional[str] = None


@dataclass
class TelegramLinkResult:
    linked: bool
    telegram_chat_id: Optional[str] = None


def _mode() -> str:
    return current_app.config.get("AUTHEVO_MODE", "mock")


def send_otp(phone: str) -> OtpSendResult:
    if _mode() == "mock":
        logger.info("[authevo:mock] send_otp phone=%s", phone)
        return OtpSendResult(channel="whatsapp", expires_in=300)

    raise NotImplementedError("Live AuthEvo integration not implemented yet")


def verify_otp(phone: str, code: str) -> bool:
    if _mode() == "mock":
        logger.info("[authevo:mock] verify_otp phone=%s code=%s", phone, code)
        return True

    raise NotImplementedError("Live AuthEvo integration not implemented yet")


def link_telegram(phone: str) -> TelegramLinkResult:
    if _mode() == "mock":
        logger.info("[authevo:mock] link_telegram phone=%s", phone)
        return TelegramLinkResult(linked=True, telegram_chat_id="mock-chat-id")

    raise NotImplementedError("Live AuthEvo integration not implemented yet")
