"""Gemini Flash provider adapter — AI suggestion for request descriptions.

Honors GEMINI_API_KEY presence; without it (mock mode) this does a simple
passthrough so the rest of the system works offline.
"""

import logging
from dataclasses import dataclass

from flask import current_app
from google import genai
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


@dataclass
class SuggestionResult:
    suggested_description: str
    recommended_work_type: str


class GeminiResponse(BaseModel):
    suggested_description: str = Field(description="The expanded and improved description in Arabic.")
    recommended_work_type: str = Field(description="One of the allowed work types: plumber, electrician, carpenter, it.")


def _has_live_key() -> bool:
    return bool(current_app.config.get("GEMINI_API_KEY"))


def suggest(description: str) -> SuggestionResult:
    if not _has_live_key():
        logger.info("[gemini:mock] suggest description=%r", description)
        return SuggestionResult(
            suggested_description=description,
            recommended_work_type="it",
        )

    api_key = current_app.config.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    system_instruction = (
        "أنت مساعد ذكي لتطبيق خدمات الصيانة المنزلية (سباك، كهربائي، نجار، صيانة حاسوب/تقنية معلومات). "
        "مهمتك هي أخذ وصف المشكلة الموجز من المستخدم، وتوسيعه ليصبح وصفاً احترافياً ودقيقاً ومفصلاً بالمصري، "
        "ثم تحديد نوع العامل الأنسب لهذه المشكلة من بين الخيارات التالية فقط: "
        "'plumber', 'electrician', 'carpenter', 'it'."
    )

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=f"وصف المستخدم: {description}",
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=GeminiResponse,
                temperature=0.7,
            ),
        )
        
        parsed = response.parsed
        return SuggestionResult(
            suggested_description=parsed.suggested_description,
            recommended_work_type=parsed.recommended_work_type,
        )
    except Exception as e:
        logger.exception(f"[gemini] Failed to generate suggestion for '{description}': {e}")
        # Fallback in case of failure
        return SuggestionResult(
            suggested_description=description,
            recommended_work_type="it",
        )

