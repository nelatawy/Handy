"""job_service — job lifecycle state machine + payment trigger (BACKEND_PLAN.md §6)."""

from datetime import datetime
from decimal import Decimal

from app.extensions import db
from app.models.enums import CanceledBy, JobStatus, PaymentMethod, PaymentStatus
from app.models.job import Job
from app.models.offer import Offer
from app.models.payment import Payment
from app.models.worker_profile import WorkerProfile
from app.providers import paymob
from app.sockets.emitters import (
    emit_job_canceled_by_user,
    emit_job_canceled_by_worker,
    emit_job_status_changed,
    emit_payment_confirmed,
    emit_payment_failed,
)

PLATFORM_FEE_RATE = Decimal("0.05")


class JobServiceError(Exception):
    def __init__(self, message: str, code: str = "bad_request", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def get_job_or_404(job_id: str) -> Job:
    job = Job.query.get(job_id)
    if job is None:
        raise JobServiceError("Job not found", code="not_found", status_code=404)
    return job


def _agreed_price(job: Job) -> Decimal:
    offer = Offer.query.get(job.offer_id)
    return offer.price


def _total_charged(job: Job) -> Decimal:
    return (_agreed_price(job) * (Decimal("1") + PLATFORM_FEE_RATE)).quantize(Decimal("0.01"))


def _credit_worker_completion(worker_id: str) -> None:
    profile = WorkerProfile.query.filter_by(user_id=worker_id).first()
    if profile is not None:
        profile.completed_jobs_count += 1


def start_job(job_id: str, user_id: str) -> Job:
    job = get_job_or_404(job_id)
    if job.user_id != user_id:
        raise JobServiceError("Not your job", code="forbidden", status_code=403)
    if job.status != JobStatus.PENDING:
        raise JobServiceError("Job can only be started from pending", code="invalid_state")

    job.status = JobStatus.STARTED
    job.started_at = datetime.utcnow()
    db.session.commit()

    emit_job_status_changed(job.user_id, job.worker_id, job.id, job.status.value)
    return job


def finish_job(job_id: str, user_id: str, payment_type: str) -> tuple[Job, str | None]:
    job = get_job_or_404(job_id)
    if job.user_id != user_id:
        raise JobServiceError("Not your job", code="forbidden", status_code=403)
    if job.status != JobStatus.STARTED:
        raise JobServiceError("Job can only be finished from started", code="invalid_state")

    total_charged = _total_charged(job)
    method = PaymentMethod(payment_type)

    if method == PaymentMethod.CASH:
        return _finish_with_cash(job, total_charged)
    return _finish_with_online_checkout(job, total_charged)


def _finish_with_cash(job: Job, total_charged: Decimal) -> tuple[Job, None]:
    payment = Payment(
        job_id=job.id,
        method=PaymentMethod.CASH,
        status=PaymentStatus.PAID,
        amount=total_charged,
    )
    db.session.add(payment)

    job.payment_type = PaymentMethod.CASH
    job.status = JobStatus.FINISHED
    job.finished_at = datetime.utcnow()
    _credit_worker_completion(job.worker_id)

    db.session.commit()

    emit_job_status_changed(job.user_id, job.worker_id, job.id, job.status.value)
    return job, None


def _finish_with_online_checkout(job: Job, total_charged: Decimal) -> tuple[Job, str]:
    checkout = paymob.create_checkout(job.id, float(total_charged))

    payment = Payment(
        job_id=job.id,
        method=PaymentMethod.ONLINE,
        status=PaymentStatus.PENDING,
        amount=total_charged,
        paymob_order_id=checkout.order_id,
    )
    db.session.add(payment)

    # Job stays 'started' — it only flips to 'finished' once the webhook confirms payment.
    job.payment_type = PaymentMethod.ONLINE

    db.session.commit()

    return job, checkout.checkout_url


def cancel_job_by_user(job_id: str, user_id: str) -> Job:
    job = get_job_or_404(job_id)
    if job.user_id != user_id:
        raise JobServiceError("Not your job", code="forbidden", status_code=403)
    if job.status not in (JobStatus.PENDING, JobStatus.STARTED):
        raise JobServiceError("Job can only be canceled from pending or started", code="invalid_state")

    job.status = JobStatus.CANCELED
    job.canceled_by = CanceledBy.USER
    job.canceled_at = datetime.utcnow()
    db.session.commit()

    emit_job_status_changed(job.user_id, job.worker_id, job.id, job.status.value)
    emit_job_canceled_by_user(job.worker_id, job.id)
    return job


def cancel_job_by_worker(job_id: str, worker_id: str) -> Job:
    job = get_job_or_404(job_id)
    if job.worker_id != worker_id:
        raise JobServiceError("Not your job", code="forbidden", status_code=403)
    if job.status not in (JobStatus.PENDING, JobStatus.STARTED):
        raise JobServiceError("Job can only be canceled from pending or started", code="invalid_state")

    job.status = JobStatus.CANCELED
    job.canceled_by = CanceledBy.WORKER
    job.canceled_at = datetime.utcnow()
    db.session.commit()

    emit_job_status_changed(job.user_id, job.worker_id, job.id, job.status.value)
    emit_job_canceled_by_worker(job.user_id, job.id)
    return job


def handle_paymob_webhook(payload: dict, hmac_signature: str) -> None:
    if not paymob.verify_webhook_signature(payload, hmac_signature):
        raise JobServiceError("Invalid webhook signature", code="invalid_signature", status_code=400)

    order_id = payload.get("orderId")
    payment = Payment.query.filter_by(paymob_order_id=order_id, status=PaymentStatus.PENDING).first()
    if payment is None:
        raise JobServiceError("No matching pending payment", code="not_found", status_code=404)

    job = get_job_or_404(payment.job_id)
    success = bool(payload.get("success"))

    if success:
        payment.status = PaymentStatus.PAID
        payment.paymob_transaction_id = payload.get("transactionId")

        job.status = JobStatus.FINISHED
        job.finished_at = datetime.utcnow()
        _credit_worker_completion(job.worker_id)

        db.session.commit()

        emit_payment_confirmed(job.user_id, job.worker_id, job.id, float(payment.amount))
        emit_job_status_changed(job.user_id, job.worker_id, job.id, job.status.value)
    else:
        payment.status = PaymentStatus.FAILED
        db.session.commit()

        emit_payment_failed(job.user_id, job.id)
