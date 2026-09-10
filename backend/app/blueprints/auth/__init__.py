from flask import Blueprint

auth_bp = Blueprint("auth", __name__)

# Routes are added starting Phase 2+ per BACKEND_PLAN.md.
from app.blueprints.auth import routes  # noqa: E402,F401
