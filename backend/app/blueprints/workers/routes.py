from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity

from app.blueprints.workers import workers_bp
from app.decorators import worker_required
from app.models.enums import WorkType
from app.services import request_service


@workers_bp.route("/me/requests", methods=["GET"])
@worker_required
def list_my_matching_requests():
    worker_id = get_jwt_identity()
    work_type = WorkType(get_jwt().get("work_type"))
    reqs = request_service.list_open_requests_for_worker(worker_id, work_type)
    return jsonify([request_service.serialize_request(r) for r in reqs]), 200
