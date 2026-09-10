from flask import jsonify, request as flask_request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.blueprints.requests import requests_bp
from app.decorators import user_required, worker_required
from app.schemas.request_schemas import ChooseOfferSchema, CreateOfferSchema, CreateRequestSchema
from app.services import request_service
from app.services.request_service import RequestServiceError


def _error(exc: RequestServiceError):
    return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status_code


@requests_bp.route("", methods=["POST"])
@user_required
def create_request():
    try:
        data = CreateRequestSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    user_id = get_jwt_identity()
    try:
        req = request_service.create_request(
            user_id=user_id,
            description=data["description"],
            work_type=data["work_type"],
            image_urls=data.get("images") or [],
        )
    except RequestServiceError as exc:
        return _error(exc)

    return jsonify({"requestId": req.id}), 201


@requests_bp.route("/mine", methods=["GET"])
@user_required
def list_my_requests():
    user_id = get_jwt_identity()
    reqs = request_service.list_requests_for_user(user_id)
    return jsonify([request_service.serialize_request(r) for r in reqs]), 200


@requests_bp.route("/<request_id>", methods=["GET"])
@jwt_required()
def get_request(request_id):
    requester_id = get_jwt_identity()
    role = get_jwt().get("role")
    try:
        req = request_service.get_request_for_viewer(request_id, requester_id, role)
    except RequestServiceError as exc:
        return _error(exc)
    return jsonify(request_service.serialize_request(req)), 200


@requests_bp.route("/<request_id>/offers", methods=["GET"])
@user_required
def list_offers(request_id):
    try:
        offers = request_service.list_offers_for_request(request_id)
    except RequestServiceError as exc:
        return _error(exc)
    return jsonify([request_service.serialize_offer(o) for o in offers]), 200


@requests_bp.route("/<request_id>/offer", methods=["POST"])
@worker_required
def submit_offer(request_id):
    try:
        data = CreateOfferSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    worker_id = get_jwt_identity()
    try:
        offer = request_service.create_offer(request_id, worker_id, data["price"])
    except RequestServiceError as exc:
        return _error(exc)

    return jsonify({"offerId": offer.id, "priceWithFee": float(offer.price_with_fee)}), 201


@requests_bp.route("/<request_id>/decline", methods=["POST"])
@worker_required
def decline_request(request_id):
    worker_id = get_jwt_identity()
    try:
        request_service.decline_request(request_id, worker_id)
    except RequestServiceError as exc:
        return _error(exc)
    return jsonify({"success": True}), 200


@requests_bp.route("/<request_id>/choose", methods=["POST"])
@user_required
def choose_offer(request_id):
    try:
        data = ChooseOfferSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    user_id = get_jwt_identity()
    try:
        job = request_service.choose_offer(request_id, data["offer_id"], user_id)
    except RequestServiceError as exc:
        return _error(exc)

    return jsonify({"jobId": job.id}), 200


@requests_bp.route("/<request_id>/cancel", methods=["POST"])
@user_required
def cancel_request(request_id):
    user_id = get_jwt_identity()
    try:
        req = request_service.cancel_request(request_id, user_id)
    except RequestServiceError as exc:
        return _error(exc)
    return jsonify({"request": request_service.serialize_request(req)}), 200
