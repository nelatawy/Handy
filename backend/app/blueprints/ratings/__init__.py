from flask import Blueprint

ratings_bp = Blueprint("ratings", __name__)

# Routes are added starting Phase 2+ per BACKEND_PLAN.md.
from app.blueprints.ratings import routes  # noqa: E402,F401
