from flask import Blueprint

otp_bp = Blueprint("otp", __name__)

# Routes are added starting Phase 2+ per BACKEND_PLAN.md.
from app.blueprints.otp import routes  # noqa: E402,F401
