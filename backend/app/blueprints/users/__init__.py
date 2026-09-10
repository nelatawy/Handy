from flask import Blueprint

users_bp = Blueprint("users", __name__)

# Routes are added starting Phase 2+ per BACKEND_PLAN.md.
from app.blueprints.users import routes  # noqa: E402,F401
