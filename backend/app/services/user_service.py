"""user_service — normal user's own profile (BACKEND_PLAN.md §7, reverse audit).

Not in BACKEND_PLAN.md's original folder listing, added for the same reason as
worker_service.py — keeps this logic out of route handlers.
"""

from app.data.geo_data import is_valid_country, is_valid_governorate
from app.extensions import db
from app.models.user import User


class UserServiceError(Exception):
    def __init__(self, message: str, code: str = "bad_request", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def get_user_or_404(user_id: str) -> User:
    user = User.query.get(user_id)
    if user is None:
        raise UserServiceError("User not found", code="not_found", status_code=404)
    return user


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "phone": user.phone_number,
        "country": user.country,
        "governorate": user.governorate,
        "role": user.role,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
    }


def update_user_profile(user_id: str, username, country, governorate) -> User:
    user = get_user_or_404(user_id)

    if username is not None and username != user.username:
        if User.query.filter_by(username=username).first() is not None:
            raise UserServiceError("Username already taken", code="username_taken", status_code=409)
        user.username = username

    if country is not None:
        if not is_valid_country(country):
            raise UserServiceError("Invalid country", code="invalid_country")
        user.country = country

    if governorate is not None:
        effective_country = country or user.country
        if not is_valid_governorate(effective_country, governorate):
            raise UserServiceError("Invalid governorate", code="invalid_governorate")
        user.governorate = governorate

    db.session.commit()
    return user
