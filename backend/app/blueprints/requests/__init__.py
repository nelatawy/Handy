from flask import Blueprint

requests_bp = Blueprint("requests", __name__)

# Routes are added starting Phase 2+ per BACKEND_PLAN.md.
from app.blueprints.requests import routes  # noqa: E402,F401
