"""Seed fixtures — sample users/workers and a full request->offer->job->rating cycle
(BACKEND_PLAN.md §8). Run with: `python -m scripts.seed` from the backend/ directory.

Idempotent-ish: safe to re-run against a fresh DB; will fail on a unique
constraint if run twice against the same DB without clearing it first.
"""

import sys

from app import create_app
from app.extensions import bcrypt, db
from app.models.enums import WorkType
from app.models.job import Job
from app.models.offer import Offer
from app.models.payment import Payment
from app.models.rating import Rating
from app.models.request import Request
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.services import job_service, rating_service, request_service

PASSWORD = "password123"


def _make_user(username, phone, country, governorate, role):
    user = User(
        username=username,
        phone_number=phone,
        country_prefix=phone[:3],
        country=country,
        governorate=governorate,
        password_hash=bcrypt.generate_password_hash(PASSWORD).decode("utf-8"),
        role=role,
    )
    db.session.add(user)
    db.session.commit()
    return user


def _make_worker_profile(user, work_type, bio, has_shop=False, shop_location=None):
    profile = WorkerProfile(
        user_id=user.id,
        work_type=work_type,
        bio=bio,
        has_shop=has_shop,
        shop_location=shop_location,
    )
    db.session.add(profile)
    db.session.commit()
    return profile


def seed():
    print("Seeding sample users...")
    alice = _make_user("alice", "+201000000001", "EG", "Cairo", "user")
    bob = _make_user("bob_user", "+201000000002", "EG", "Giza", "user")

    print("Seeding sample workers (one per work type, some with shops)...")
    plumber = _make_user("sayed_plumber", "+201000000010", "EG", "Cairo", "worker")
    _make_worker_profile(
        plumber, WorkType.PLUMBER, "15 years fixing pipes and leaks.", has_shop=True, shop_location="Downtown Cairo"
    )

    electrician = _make_user("mona_electrician", "+201000000011", "EG", "Giza", "worker")
    _make_worker_profile(electrician, WorkType.ELECTRICIAN, "Licensed electrician, residential & commercial.")

    carpenter = _make_user("hassan_carpenter", "+201000000012", "EG", "Alexandria", "worker")
    _make_worker_profile(
        carpenter, WorkType.CARPENTER, "Custom furniture and repairs.", has_shop=True, shop_location="Alexandria Corniche"
    )

    it_worker = _make_user("laila_it", "+201000000013", "EG", "Cairo", "worker")
    _make_worker_profile(it_worker, WorkType.IT, "PC repair, networking, smart home setup.")

    print("Walking a full cycle #1 (online payment)...")
    request1 = request_service.create_request(
        user_id=alice.id,
        description="Kitchen sink is leaking badly, needs a plumber ASAP.",
        work_type=WorkType.PLUMBER.value,
        image_urls=[],
    )
    offer1 = request_service.create_offer(request1.id, plumber.id, 150)
    job1 = request_service.choose_offer(request1.id, offer1.id, alice.id)
    job_service.start_job(job1.id, alice.id)
    job1, payment_url = job_service.finish_job(job1.id, alice.id, "online")
    payment1 = Payment.query.filter_by(job_id=job1.id).first()
    job_service.handle_paymob_webhook({"orderId": payment1.paymob_order_id, "success": True, "transactionId": "seed-txn-1"}, "")
    rating_service.rate_job(job1.id, alice.id, 5, "Fixed it quickly, very professional!")

    print("Walking a full cycle #2 (cash payment)...")
    request2 = request_service.create_request(
        user_id=bob.id,
        description="Need a few power outlets installed in the living room.",
        work_type=WorkType.ELECTRICIAN.value,
        image_urls=[],
    )
    offer2 = request_service.create_offer(request2.id, electrician.id, 200)
    job2 = request_service.choose_offer(request2.id, offer2.id, bob.id)
    job_service.start_job(job2.id, bob.id)
    job_service.finish_job(job2.id, bob.id, "cash")
    rating_service.rate_job(job2.id, bob.id, 4, "Good work, a bit late though.")

    print("Seeding an open, unclaimed request (for frontend live-feed testing)...")
    request_service.create_request(
        user_id=alice.id,
        description="Need a custom bookshelf built for the living room.",
        work_type=WorkType.CARPENTER.value,
        image_urls=[],
    )

    print("Done.")
    print(f"  Users: alice / bob_user (password: {PASSWORD})")
    print(f"  Workers: sayed_plumber / mona_electrician / hassan_carpenter / laila_it (password: {PASSWORD})")
    print(f"  Finished jobs: {job1.id} (online), {job2.id} (cash)")


def main():
    app = create_app("development")
    with app.app_context():
        if User.query.count() > 0:
            print("Database is not empty — refusing to seed. Drop/reset the DB first.", file=sys.stderr)
            sys.exit(1)
        seed()


if __name__ == "__main__":
    main()
