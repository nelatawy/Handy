"""auth_service — registration & login (BACKEND_PLAN.md §4)."""

import phonenumbers
from flask_jwt_extended import create_access_token

from app.data.geo_data import is_valid_country, is_valid_governorate
from app.extensions import bcrypt, db
from app.models.enums import WorkType
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.services.otp_service import is_phone_verified, normalize_phone


class AuthServiceError(Exception):
    def __init__(self, message: str, code: str = "bad_request", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def _issue_token(user: User, worker_profile: WorkerProfile = None) -> str:
    claims = {"role": user.role}
    if worker_profile is not None:
        claims["work_type"] = worker_profile.work_type.value
    return create_access_token(identity=user.id, additional_claims=claims)


def register(data: dict) -> dict:
    phone = normalize_phone(data["phone"])

    if not is_phone_verified(phone):
        raise AuthServiceError("Phone number is not verified", code="phone_not_verified")

    if not is_valid_country(data["country"]):
        raise AuthServiceError("Invalid country", code="invalid_country")
    if not is_valid_governorate(data["country"], data["governorate"]):
        raise AuthServiceError("Invalid governorate", code="invalid_governorate")

    if User.query.filter_by(username=data["username"]).first() is not None:
        raise AuthServiceError("Username already taken", code="username_taken", status_code=409)
    if User.query.filter_by(phone_number=phone).first() is not None:
        raise AuthServiceError("Phone number already registered", code="phone_taken", status_code=409)

    parsed = phonenumbers.parse(phone, None)
    country_prefix = f"+{parsed.country_code}"

    password_hash = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    user = User(
        username=data["username"],
        phone_number=phone,
        country_prefix=country_prefix,
        country=data["country"],
        governorate=data["governorate"],
        password_hash=password_hash,
        role=data["role"],
    )
    db.session.add(user)
    db.session.flush()

    worker_profile = None
    if data["role"] == "worker":
        worker_profile = WorkerProfile(
            user_id=user.id,
            work_type=WorkType(data["work_type"]),
            bio=data["bio"],
            has_shop=bool(data.get("has_shop")),
            shop_location=data.get("shop_location"),
        )
        db.session.add(worker_profile)

    db.session.commit()

    token = _issue_token(user, worker_profile)
    return {"token": token, "role": user.role}


def login(identifier_type: str, identifier: str, password: str) -> dict:
    if identifier_type == "phone":
        phone = normalize_phone(identifier)
        user = User.query.filter_by(phone_number=phone).first()
    else:
        user = User.query.filter_by(username=identifier).first()

    if user is None or not bcrypt.check_password_hash(user.password_hash, password):
        raise AuthServiceError("Invalid credentials", code="invalid_credentials", status_code=401)

    worker_profile = WorkerProfile.query.filter_by(user_id=user.id).first() if user.role == "worker" else None

    token = _issue_token(user, worker_profile)
    return {"token": token, "role": user.role}
