from flask import jsonify, request as flask_request
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError

from app.blueprints.users import users_bp
from app.decorators import user_required
from app.schemas.user_schemas import UpdateUserSchema
from app.services import user_service
from app.services.user_service import UserServiceError


@users_bp.route("/me", methods=["GET"])
@user_required
def get_my_profile():
    user_id = get_jwt_identity()
    try:
        user = user_service.get_user_or_404(user_id)
    except UserServiceError as exc:
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code
    return jsonify(user_service.serialize_user(user)), 200


@users_bp.route("/me", methods=["PUT"])
@user_required
def update_my_profile():
    try:
        data = UpdateUserSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    user_id = get_jwt_identity()
    try:
        user = user_service.update_user_profile(
            user_id, data.get("username"), data.get("country"), data.get("governorate")
        )
    except UserServiceError as exc:
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code

    return jsonify({"user": user_service.serialize_user(user)}), 200
