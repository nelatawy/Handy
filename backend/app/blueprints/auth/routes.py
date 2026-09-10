from flask import jsonify, request as flask_request
from marshmallow import ValidationError

from app.blueprints.auth import auth_bp
from app.schemas.auth_schemas import LoginSchema, RegisterSchema
from app.services import auth_service
from app.services.auth_service import AuthServiceError
from app.services.otp_service import OtpServiceError


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = RegisterSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    try:
        result = auth_service.register(data)
    except (AuthServiceError, OtpServiceError) as exc:
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code

    return jsonify(result), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = LoginSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    try:
        result = auth_service.login(data["identifier_type"], data["identifier"], data["password"])
    except (AuthServiceError, OtpServiceError) as exc:
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code

    return jsonify(result), 200
