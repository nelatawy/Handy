from flask import Blueprint

ai_bp = Blueprint("ai", __name__)

# Routes are added starting Phase 2+ per BACKEND_PLAN.md.
from app.blueprints.ai import routes  # noqa: E402,F401
