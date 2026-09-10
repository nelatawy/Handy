from flask import jsonify, request as flask_request
from flask_jwt_extended import get_jwt, get_jwt_identity
from marshmallow import ValidationError

from app.blueprints.workers import workers_bp
from app.decorators import worker_required
from app.models.enums import WorkType
from app.schemas.worker_schemas import UpdateWorkerProfileSchema
from app.services import payment_service, rating_service, request_service, worker_service
from app.services.worker_service import WorkerServiceError


@workers_bp.route("/me/requests", methods=["GET"])
@worker_required
def list_my_matching_requests():
    worker_id = get_jwt_identity()
    work_type = WorkType(get_jwt().get("work_type"))
    reqs = request_service.list_open_requests_for_worker(worker_id, work_type)
    return jsonify([request_service.serialize_request(r) for r in reqs]), 200


@workers_bp.route("/me", methods=["GET"])
@worker_required
def get_my_profile():
    worker_id = get_jwt_identity()
    try:
        profile = worker_service.get_worker_profile_or_404(worker_id)
    except WorkerServiceError as exc:
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code
    return jsonify(worker_service.serialize_worker(profile)), 200


@workers_bp.route("/me", methods=["PUT"])
@worker_required
def update_my_profile():
    try:
        data = UpdateWorkerProfileSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    worker_id = get_jwt_identity()
    try:
        profile = worker_service.update_worker_profile(
            worker_id, data.get("bio"), data.get("has_shop"), data.get("shop_location")
        )
    except WorkerServiceError as exc:
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code

    return jsonify({"worker": worker_service.serialize_worker(profile)}), 200


@workers_bp.route("/me/earnings", methods=["GET"])
@worker_required
def get_my_earnings():
    worker_id = get_jwt_identity()
    return jsonify(payment_service.get_worker_earnings(worker_id)), 200


@workers_bp.route("/<worker_id>", methods=["GET"])
def get_worker_public_profile(worker_id):
    try:
        profile = worker_service.get_worker_profile_or_404(worker_id)
    except WorkerServiceError as exc:
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code
    return jsonify(worker_service.serialize_worker(profile)), 200


@workers_bp.route("/<worker_id>/ratings", methods=["GET"])
def get_worker_ratings(worker_id):
    page = flask_request.args.get("page", default=1, type=int)
    return jsonify(rating_service.get_worker_ratings(worker_id, page)), 200
