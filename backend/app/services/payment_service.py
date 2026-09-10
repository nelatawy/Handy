"""payment_service — payment history, worker earnings & payouts (BACKEND_PLAN.md §7)."""

from decimal import Decimal

from app.extensions import db
from app.models.enums import JobStatus, PaymentMethod, PaymentStatus
from app.models.job import Job
from app.models.offer import Offer
from app.models.payment import Payment
from app.models.payout import Payout
from app.providers import paymob

PAGE_SIZE = 10


class PaymentServiceError(Exception):
    def __init__(self, message: str, code: str = "bad_request", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def get_payment_history(user_id: str, page: int) -> dict:
    query = (
        Payment.query.join(Job, Payment.job_id == Job.id)
        .filter(Job.user_id == user_id)
        .order_by(Payment.created_at.desc())
    )
    total = query.count()
    payments = query.offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).all()

    return {
        "transactions": [
            {
                "id": p.id,
                "jobId": p.job_id,
                "amount": float(p.amount),
                "method": p.method.value,
                "status": p.status.value,
                "createdAt": p.created_at.isoformat() if p.created_at else None,
            }
            for p in payments
        ],
        "page": page,
        "total": total,
    }


def _compute_worker_balance(worker_id: str) -> Decimal:
    finished_online_jobs = (
        db.session.query(Offer.price)
        .join(Job, Job.offer_id == Offer.id)
        .filter(
            Job.worker_id == worker_id,
            Job.status == JobStatus.FINISHED,
            Job.payment_type == PaymentMethod.ONLINE,
        )
        .all()
    )
    total_earned = sum((row[0] for row in finished_online_jobs), Decimal("0"))

    prior_payouts = (
        db.session.query(Payout.amount).filter(Payout.worker_id == worker_id).all()
    )
    total_paid_out = sum((row[0] for row in prior_payouts), Decimal("0"))

    return total_earned - total_paid_out


def get_worker_earnings(worker_id: str) -> dict:
    balance = _compute_worker_balance(worker_id)

    finished_online_jobs = (
        Job.query.join(Offer, Job.offer_id == Offer.id)
        .filter(
            Job.worker_id == worker_id,
            Job.status == JobStatus.FINISHED,
            Job.payment_type == PaymentMethod.ONLINE,
        )
        .order_by(Job.finished_at.desc())
        .all()
    )

    return {
        "balance": float(balance),
        "transactions": [
            {
                "jobId": job.id,
                "amount": float(Offer.query.get(job.offer_id).price),
                "finishedAt": job.finished_at.isoformat() if job.finished_at else None,
            }
            for job in finished_online_jobs
        ],
    }


def request_payout(job_id: str, worker_id: str) -> Payout:
    job = Job.query.get(job_id)
    if job is None:
        raise PaymentServiceError("Job not found", code="not_found", status_code=404)
    if job.worker_id != worker_id:
        raise PaymentServiceError("Not your job", code="forbidden", status_code=403)

    balance = _compute_worker_balance(worker_id)
    if balance <= 0:
        raise PaymentServiceError("No payable balance to withdraw", code="no_balance")

    from app.models.user import User
    worker = User.query.get(worker_id)
    worker_phone = worker.phone_number if worker else None
    worker_name = worker.username if worker else None

    try:
        reference = paymob.create_payout(
            worker_id=worker_id,
            amount=float(balance),
            worker_phone=worker_phone,
            worker_name=worker_name,
        )
    except RuntimeError as exc:
        raise PaymentServiceError(str(exc), code="payout_failed", status_code=502)

    payout = Payout(
        worker_id=worker_id,
        job_id=job_id,
        amount=balance,
        paymob_reference=reference,
        status=PaymentStatus.PAID,
    )
    db.session.add(payout)
    db.session.commit()
    return payout
