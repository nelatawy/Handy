import itertools

import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from app.extensions import bcrypt, db
from app.models.enums import WorkType
from app.models.user import User
from app.models.worker_profile import WorkerProfile

_counter = itertools.count()


@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def make_user(app):
    """Factory fixture: make_user(role='user'|'worker', work_type=WorkType.PLUMBER) -> (User, jwt_token)."""

    def _make(role="user", work_type=None, **overrides):
        n = next(_counter)
        defaults = dict(
            username=f"testuser{n}",
            phone_number=f"+2010{n:08d}",
            country_prefix="+20",
            country="Egypt",
            governorate="Cairo",
            password_hash=bcrypt.generate_password_hash("password123").decode(),
            role=role,
        )
        defaults.update(overrides)
        user = User(**defaults)
        db.session.add(user)
        db.session.commit()

        worker_profile = None
        if role == "worker":
            worker_profile = WorkerProfile(
                user_id=user.id,
                work_type=work_type or WorkType.PLUMBER,
                bio="Experienced professional",
                has_shop=False,
            )
            db.session.add(worker_profile)
            db.session.commit()

        claims = {"role": role}
        if worker_profile is not None:
            claims["work_type"] = worker_profile.work_type.value
        token = create_access_token(identity=user.id, additional_claims=claims)

        return user, token

    return _make


@pytest.fixture
def auth_header():
    def _header(token):
        return {"Authorization": f"Bearer {token}"}

    return _header


@pytest.fixture
def make_job(client, make_user, auth_header):
    """Factory fixture: walks request -> offer -> choose, returns
    (user, user_token, worker, worker_token, job_id, request_id, offer_id)."""

    def _make(price=200):
        user, user_token = make_user("user")
        worker, worker_token = make_user("worker")

        r = client.post(
            "/api/requests",
            json={"description": "Fix the sink", "workType": "plumber", "images": []},
            headers=auth_header(user_token),
        )
        request_id = r.get_json()["requestId"]

        r = client.post(
            f"/api/requests/{request_id}/offer",
            json={"price": price},
            headers=auth_header(worker_token),
        )
        offer_id = r.get_json()["offerId"]

        r = client.post(
            f"/api/requests/{request_id}/choose",
            json={"offerId": offer_id},
            headers=auth_header(user_token),
        )
        job_id = r.get_json()["jobId"]

        return user, user_token, worker, worker_token, job_id, request_id, offer_id

    return _make
