"""Business logic for requests/offers/job-creation (BACKEND_PLAN.md §5)."""

from decimal import Decimal

from app.extensions import db
from app.models.enums import JobStatus, OfferStatus, RequestStatus
from app.models.job import Job
from app.models.offer import Offer
from app.models.request import Request, RequestImage
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.sockets.emitters import (
    emit_new_offer,
    emit_new_request,
    emit_offer_chosen,
    emit_offer_rejected,
    emit_request_closed,
)

PLATFORM_FEE_RATE = Decimal("0.05")

MAX_IMAGES = 5


class RequestServiceError(Exception):
    def __init__(self, message: str, code: str = "bad_request", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def create_request(user_id: str, description: str, work_type: str, image_urls: list[str]) -> Request:
    if len(image_urls) > MAX_IMAGES:
        raise RequestServiceError(f"A request may have at most {MAX_IMAGES} images")

    req = Request(user_id=user_id, description=description, work_type=work_type, status=RequestStatus.OPEN)
    db.session.add(req)
    db.session.flush()

    for url in image_urls:
        db.session.add(RequestImage(request_id=req.id, url=url))

    db.session.commit()

    emit_new_request(req.work_type.value, serialize_request(req))
    return req


def list_requests_for_user(user_id: str) -> list[Request]:
    return Request.query.filter_by(user_id=user_id).order_by(Request.created_at.desc()).all()


def get_request_or_404(request_id: str) -> Request:
    req = Request.query.get(request_id)
    if req is None:
        raise RequestServiceError("Request not found", code="not_found", status_code=404)
    return req


def get_request_for_viewer(request_id: str, requester_id: str, role: str) -> Request:
    """GET /api/requests/:id — the request's own user, or any worker (open marketplace
    visibility; matching-type requests are already filtered to workers via the feed, this
    just lets a worker follow a link from that feed into the detail/pricing screens)."""
    req = get_request_or_404(request_id)
    if role == "user" and req.user_id != requester_id:
        raise RequestServiceError("Not your request", code="forbidden", status_code=403)
    return req


def list_offers_for_request(request_id: str) -> list[Offer]:
    get_request_or_404(request_id)
    return (
        Offer.query.filter_by(request_id=request_id)
        .filter(Offer.status != OfferStatus.REJECTED)
        .order_by(Offer.created_at.asc())
        .all()
    )


def list_open_requests_for_worker(worker_id: str, work_type) -> list[Request]:
    already_seen_ids = db.session.query(Offer.request_id).filter(Offer.worker_id == worker_id)
    return (
        Request.query.filter(
            Request.work_type == work_type,
            Request.status == RequestStatus.OPEN,
            ~Request.id.in_(already_seen_ids),
        )
        .order_by(Request.created_at.desc())
        .all()
    )


def create_offer(request_id: str, worker_id: str, price: Decimal) -> Offer:
    req = get_request_or_404(request_id)
    if req.status != RequestStatus.OPEN:
        raise RequestServiceError("Request is no longer open", code="request_closed")

    existing = Offer.query.filter_by(request_id=request_id, worker_id=worker_id).first()
    if existing is not None:
        raise RequestServiceError("You have already responded to this request", code="already_responded")

    price_with_fee = (price * (Decimal("1") + PLATFORM_FEE_RATE)).quantize(Decimal("0.01"))

    offer = Offer(
        request_id=request_id,
        worker_id=worker_id,
        price=price,
        price_with_fee=price_with_fee,
        status=OfferStatus.PENDING,
    )
    db.session.add(offer)
    db.session.commit()

    emit_new_offer(req.user_id, serialize_offer(offer))
    return offer


def decline_request(request_id: str, worker_id: str) -> None:
    req = get_request_or_404(request_id)

    existing = Offer.query.filter_by(request_id=request_id, worker_id=worker_id).first()
    if existing is not None:
        raise RequestServiceError("You have already responded to this request", code="already_responded")

    db.session.add(
        Offer(
            request_id=req.id,
            worker_id=worker_id,
            price=Decimal("0"),
            price_with_fee=Decimal("0"),
            status=OfferStatus.REJECTED,
        )
    )
    db.session.commit()


def choose_offer(request_id: str, offer_id: str, user_id: str) -> Job:
    req = get_request_or_404(request_id)
    if req.user_id != user_id:
        raise RequestServiceError("Not your request", code="forbidden", status_code=403)
    if req.status != RequestStatus.OPEN:
        raise RequestServiceError("Request is no longer open", code="request_closed")

    offer = Offer.query.filter_by(id=offer_id, request_id=request_id).first()
    if offer is None:
        raise RequestServiceError("Offer not found", code="not_found", status_code=404)
    if offer.status != OfferStatus.PENDING:
        raise RequestServiceError("Offer is no longer available", code="offer_unavailable")

    sibling_offers = Offer.query.filter(
        Offer.request_id == request_id,
        Offer.id != offer_id,
        Offer.status == OfferStatus.PENDING,
    ).all()

    offer.status = OfferStatus.CHOSEN
    req.status = RequestStatus.OFFER_SELECTED
    for sibling in sibling_offers:
        sibling.status = OfferStatus.REJECTED

    job = Job(
        request_id=req.id,
        offer_id=offer.id,
        user_id=req.user_id,
        worker_id=offer.worker_id,
        status=JobStatus.PENDING,
    )
    db.session.add(job)
    db.session.commit()

    emit_offer_chosen(offer.worker_id, job.id)
    for sibling in sibling_offers:
        emit_offer_rejected(sibling.worker_id, req.id)
    emit_request_closed(req.work_type.value, req.id)

    return job


def cancel_request(request_id: str, user_id: str) -> Request:
    req = get_request_or_404(request_id)
    if req.user_id != user_id:
        raise RequestServiceError("Not your request", code="forbidden", status_code=403)
    if req.status != RequestStatus.OPEN:
        raise RequestServiceError("Only an open request can be canceled", code="invalid_state")

    req.status = RequestStatus.CANCELLED
    db.session.commit()

    emit_request_closed(req.work_type.value, req.id)
    return req


def serialize_request(req: Request) -> dict:
    return {
        "id": req.id,
        "userId": req.user_id,
        "description": req.description,
        "workType": req.work_type.value,
        "status": req.status.value,
        "createdAt": req.created_at.isoformat() if req.created_at else None,
        "images": [image.url for image in req.images],
    }


def serialize_offer(offer: Offer) -> dict:
    worker_profile = WorkerProfile.query.filter_by(user_id=offer.worker_id).first()
    worker = User.query.get(offer.worker_id)
    return {
        "id": offer.id,
        "requestId": offer.request_id,
        "workerId": offer.worker_id,
        "price": float(offer.price),
        "priceWithFee": float(offer.price_with_fee),
        "status": offer.status.value,
        "createdAt": offer.created_at.isoformat() if offer.created_at else None,
        "worker": {
            "id": worker.id if worker else offer.worker_id,
            "username": worker.username if worker else None,
            "workType": worker_profile.work_type.value if worker_profile else None,
            "averageRating": worker_profile.average_rating if worker_profile else 0.0,
            "ratingsCount": worker_profile.ratings_count if worker_profile else 0,
            "completedJobsCount": worker_profile.completed_jobs_count if worker_profile else 0,
            "hasShop": worker_profile.has_shop if worker_profile else False,
            "shopLocation": worker_profile.shop_location if worker_profile else None,
        },
    }
