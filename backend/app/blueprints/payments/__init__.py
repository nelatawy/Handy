from flask import Blueprint

payments_bp = Blueprint("payments", __name__)

# Routes are added starting Phase 2+ per BACKEND_PLAN.md.
from app.blueprints.payments import routes  # noqa: E402,F401
