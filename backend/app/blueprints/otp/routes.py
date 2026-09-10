from flask import jsonify, request as flask_request
from marshmallow import ValidationError

from app.blueprints.otp import otp_bp
from app.schemas.auth_schemas import SendOtpSchema, VerifyOtpSchema
from app.services import otp_service
from app.services.otp_service import OtpServiceError


@otp_bp.route("/send", methods=["POST"])
def send_otp():
    try:
        data = SendOtpSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    try:
        result = otp_service.send_otp(data["phone"])
    except OtpServiceError as exc:
        error = {"code": exc.code, "message": exc.message}
        if exc.retry_after is not None:
            error["retryAfter"] = exc.retry_after
        response = jsonify({"error": error})
        if exc.status_code == 429:
            response.headers["Retry-After"] = str(exc.retry_after)
        return response, exc.status_code

    return jsonify(result), 200


@otp_bp.route("/verify", methods=["POST"])
def verify_otp():
    try:
        data = VerifyOtpSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    try:
        verified = otp_service.verify_otp(data["phone"], data["code"])
    except OtpServiceError as exc:
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code

    return jsonify({"verified": verified}), 200
