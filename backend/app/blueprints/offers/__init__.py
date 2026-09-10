from flask import Blueprint

offers_bp = Blueprint("offers", __name__)

# Routes are added starting Phase 2+ per BACKEND_PLAN.md.
from app.blueprints.offers import routes  # noqa: E402,F401
