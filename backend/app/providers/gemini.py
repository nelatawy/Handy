"""Gemini Flash provider adapter — AI suggestion for request descriptions.

Honors GEMINI_API_KEY presence; without it (mock mode) this does a simple
passthrough so the rest of the system works offline.
"""

import logging
from dataclasses import dataclass

from flask import current_app

logger = logging.getLogger(__name__)


@dataclass
class SuggestionResult:
    suggested_description: str
    recommended_work_type: str


def _has_live_key() -> bool:
    return bool(current_app.config.get("GEMINI_API_KEY"))


def suggest(description: str) -> SuggestionResult:
    if not _has_live_key():
        logger.info("[gemini:mock] suggest description=%r", description)
        return SuggestionResult(
            suggested_description=description,
            recommended_work_type="it",
        )

    raise NotImplementedError("Live Gemini integration not implemented yet")
