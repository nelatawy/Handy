from flask import jsonify, request as flask_request
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError

from app.blueprints.jobs import jobs_bp
from app.decorators import user_required, worker_required
from app.models.enums import JobStatus
from app.schemas.job_schemas import JobStatusUpdateSchema
from app.services import job_service
from app.services.job_service import JobServiceError


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
