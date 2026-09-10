from flask import Blueprint

jobs_bp = Blueprint("jobs", __name__)

# Routes are added starting Phase 2+ per BACKEND_PLAN.md.
from app.blueprints.jobs import routes  # noqa: E402,F401
