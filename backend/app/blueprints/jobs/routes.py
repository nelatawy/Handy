from flask import jsonify, request as flask_request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.blueprints.jobs import jobs_bp
from app.decorators import user_required, worker_required
from app.models.enums import JobStatus
from app.schemas.job_schemas import JobStatusUpdateSchema
from app.schemas.rating_schemas import RateJobSchema
from app.services import job_service, payment_service, rating_service
from app.services.job_service import JobServiceError
from app.services.payment_service import PaymentServiceError
from app.services.rating_service import RatingServiceError


def _job_dict(job, payment_url=None):
    result = {
        "job": {
            "id": job.id,
            "requestId": job.request_id,
            "offerId": job.offer_id,
            "userId": job.user_id,
            "workerId": job.worker_id,
            "status": job.status.value,
            "paymentType": job.payment_type.value if job.payment_type else None,
            "canceledBy": job.canceled_by.value if job.canceled_by else None,
            "startedAt": job.started_at.isoformat() if job.started_at else None,
            "finishedAt": job.finished_at.isoformat() if job.finished_at else None,
            "canceledAt": job.canceled_at.isoformat() if job.canceled_at else None,
        }
    }
    if payment_url is not None:
        result["paymentUrl"] = payment_url
    return result


def _error(exc: JobServiceError):
    return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code


@jobs_bp.route("/<job_id>/status", methods=["PATCH"])
@user_required
def update_status(job_id):
    try:
        data = JobStatusUpdateSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    user_id = get_jwt_identity()
    status = data["status"]

    try:
        if status == JobStatus.STARTED.value:
            job = job_service.start_job(job_id, user_id)
            return jsonify(_job_dict(job)), 200

        if status == JobStatus.FINISHED.value:
            job, payment_url = job_service.finish_job(job_id, user_id, data["payment_type"])
            return jsonify(_job_dict(job, payment_url)), 200

        job = job_service.cancel_job_by_user(job_id, user_id)
        return jsonify(_job_dict(job)), 200
    except JobServiceError as exc:
        return _error(exc)


@jobs_bp.route("/<job_id>/cancel", methods=["POST"])
@worker_required
def worker_cancel(job_id):
    worker_id = get_jwt_identity()
    try:
        job = job_service.cancel_job_by_worker(job_id, worker_id)
    except JobServiceError as exc:
        return _error(exc)
    return jsonify(_job_dict(job)), 200


@jobs_bp.route("/active", methods=["GET"])
@jwt_required()
def get_active_job():
    requester_id = get_jwt_identity()
    role = get_jwt().get("role")
    job = job_service.get_active_job(requester_id, role)
    if job is None:
        return jsonify(None), 200
    return jsonify(job_service.serialize_job_full(job)), 200


@jobs_bp.route("/<job_id>", methods=["GET"])
@jwt_required()
def get_job(job_id):
    requester_id = get_jwt_identity()
    try:
        job = job_service.get_job_for_participant(job_id, requester_id)
    except JobServiceError as exc:
        return _error(exc)
    return jsonify(job_service.serialize_job_full(job)), 200


@jobs_bp.route("/<job_id>/rate", methods=["POST"])
@user_required
def rate_job(job_id):
    try:
        data = RateJobSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    user_id = get_jwt_identity()
    try:
        rating = rating_service.rate_job(job_id, user_id, data["stars"], data.get("comment"))
    except RatingServiceError as exc:
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code

    return (
        jsonify(
            {
                "rating": {
                    "id": rating.id,
                    "jobId": rating.job_id,
                    "stars": rating.stars,
                    "comment": rating.comment,
                    "createdAt": rating.created_at.isoformat() if rating.created_at else None,
                }
            }
        ),
        201,
    )


@jobs_bp.route("/<job_id>/payout", methods=["POST"])
@worker_required
def payout(job_id):
    worker_id = get_jwt_identity()
    try:
        result = payment_service.request_payout(job_id, worker_id)
    except PaymentServiceError as exc:
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code

    return (
        jsonify(
            {
                "payout": {
                    "id": result.id,
                    "workerId": result.worker_id,
                    "jobId": result.job_id,
                    "amount": float(result.amount),
                    "status": result.status.value,
                    "paymobReference": result.paymob_reference,
                    "createdAt": result.created_at.isoformat() if result.created_at else None,
                }
            }
        ),
        201,
    )
