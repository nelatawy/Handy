from flask import Blueprint, jsonify, request as flask_request
from flask_jwt_extended import get_jwt_identity

from app.blueprints.payments import payments_bp
from app.decorators import user_required
from app.services import job_service, payment_service
from app.services.job_service import JobServiceError

# Mounted separately at /api/webhooks in app/__init__.py, since the contract in
# BACKEND_PLAN.md §9 puts this at /api/webhooks/paymob, not under /api/payments.
webhooks_bp = Blueprint("webhooks", __name__)


@payments_bp.route("/history", methods=["GET"])
@user_required
def payment_history():
    user_id = get_jwt_identity()
    page = flask_request.args.get("page", default=1, type=int)
    return jsonify(payment_service.get_payment_history(user_id, page)), 200


@webhooks_bp.route("/paymob", methods=["POST"])
def paymob_webhook():
    payload = flask_request.get_json(silent=True) or {}
    hmac_signature = flask_request.args.get("hmac", "")

    try:
        job_service.handle_paymob_webhook(payload, hmac_signature)
    except JobServiceError as exc:
        return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code

    return jsonify({"success": True}), 200
