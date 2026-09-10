from flask import Blueprint

workers_bp = Blueprint("workers", __name__)

# Routes are added starting Phase 2+ per BACKEND_PLAN.md.
from app.blueprints.workers import routes  # noqa: E402,F401
