from app.models.payment import Payment


def test_job_created_pending_on_choose(client, make_job, auth_header):
    *_rest, job_id, _request_id, _offer_id = make_job()
    user, user_token, worker, worker_token = _rest

    r = client.get(f"/api/jobs/{job_id}", headers=auth_header(user_token))
    assert r.status_code == 200
    assert r.get_json()["status"] == "pending"


def test_only_user_can_start_job(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job()

    r = client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(worker_token))
    assert r.status_code == 403

    r = client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(user_token))
    assert r.status_code == 200
    assert r.get_json()["job"]["status"] == "started"


def test_finish_requires_payment_type(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job()
    client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(user_token))

    r = client.patch(f"/api/jobs/{job_id}/status", json={"status": "finished"}, headers=auth_header(user_token))
    assert r.status_code == 400


def test_finish_cash_settles_synchronously(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job(price=100)
    client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(user_token))

    r = client.patch(
        f"/api/jobs/{job_id}/status", json={"status": "finished", "paymentType": "cash"}, headers=auth_header(user_token)
    )
    assert r.status_code == 200
    assert r.get_json()["job"]["status"] == "finished"
    assert "paymentUrl" not in r.get_json()

    from app.models.worker_profile import WorkerProfile

    profile = WorkerProfile.query.filter_by(user_id=worker.id).first()
    assert profile.completed_jobs_count == 1


def test_finish_online_stays_started_until_webhook(client, make_job, auth_header, app):
    user, user_token, worker, worker_token, job_id, *_ = make_job(price=100)
    client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(user_token))

    r = client.patch(
        f"/api/jobs/{job_id}/status",
        json={"status": "finished", "paymentType": "online"},
        headers=auth_header(user_token),
    )
    assert r.status_code == 200
    assert r.get_json()["job"]["status"] == "started"
    assert r.get_json()["paymentUrl"]

    with app.app_context():
        payment = Payment.query.filter_by(job_id=job_id).first()
        assert payment.status.value == "pending"

    r = client.post(
        "/api/webhooks/paymob", json={"orderId": payment.paymob_order_id, "success": True, "transactionId": "t1"}
    )
    assert r.status_code == 200

    r = client.get(f"/api/jobs/{job_id}", headers=auth_header(user_token))
    assert r.get_json()["status"] == "finished"


def test_webhook_failure_leaves_job_started(client, make_job, auth_header, app):
    user, user_token, worker, worker_token, job_id, *_ = make_job(price=100)
    client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(user_token))
    client.patch(
        f"/api/jobs/{job_id}/status", json={"status": "finished", "paymentType": "online"}, headers=auth_header(user_token)
    )

    with app.app_context():
        payment = Payment.query.filter_by(job_id=job_id).first()

    r = client.post("/api/webhooks/paymob", json={"orderId": payment.paymob_order_id, "success": False})
    assert r.status_code == 200

    r = client.get(f"/api/jobs/{job_id}", headers=auth_header(user_token))
    assert r.get_json()["status"] == "started"


def test_webhook_does_not_double_confirm(client, make_job, auth_header, app):
    user, user_token, worker, worker_token, job_id, *_ = make_job(price=100)
    client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(user_token))
    client.patch(
        f"/api/jobs/{job_id}/status", json={"status": "finished", "paymentType": "online"}, headers=auth_header(user_token)
    )

    with app.app_context():
        payment = Payment.query.filter_by(job_id=job_id).first()

    client.post("/api/webhooks/paymob", json={"orderId": payment.paymob_order_id, "success": True})
    r = client.post("/api/webhooks/paymob", json={"orderId": payment.paymob_order_id, "success": True})
    assert r.status_code == 404


def test_no_payment_row_created_before_finish(client, make_job, app):
    _user, user_token, _worker, worker_token, job_id, *_ = make_job()

    with app.app_context():
        assert Payment.query.filter_by(job_id=job_id).count() == 0


def test_user_cancel_from_pending(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job()

    r = client.patch(f"/api/jobs/{job_id}/status", json={"status": "canceled"}, headers=auth_header(user_token))
    assert r.status_code == 200
    body = r.get_json()["job"]
    assert body["status"] == "canceled"
    assert body["canceledBy"] == "user"


def test_worker_cancel_from_started(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job()
    client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(user_token))

    r = client.post(f"/api/jobs/{job_id}/cancel", headers=auth_header(worker_token))
    assert r.status_code == 200
    body = r.get_json()["job"]
    assert body["status"] == "canceled"
    assert body["canceledBy"] == "worker"


def test_user_cannot_hit_worker_cancel_endpoint(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job()
    r = client.post(f"/api/jobs/{job_id}/cancel", headers=auth_header(user_token))
    assert r.status_code == 403


def test_cannot_finish_a_canceled_job(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job()
    client.patch(f"/api/jobs/{job_id}/status", json={"status": "canceled"}, headers=auth_header(user_token))

    r = client.patch(
        f"/api/jobs/{job_id}/status", json={"status": "finished", "paymentType": "cash"}, headers=auth_header(user_token)
    )
    assert r.status_code == 400
    assert r.get_json()["error"]["code"] == "invalid_state"


def test_job_not_visible_to_uninvolved_user(client, make_job, make_user, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job()
    _intruder, intruder_token = make_user("user")

    r = client.get(f"/api/jobs/{job_id}", headers=auth_header(intruder_token))
    assert r.status_code == 403


def test_active_job_endpoint_role_aware(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job()

    r = client.get("/api/jobs/active", headers=auth_header(user_token))
    assert r.get_json()["id"] == job_id

    r = client.get("/api/jobs/active", headers=auth_header(worker_token))
    assert r.get_json()["id"] == job_id

    client.patch(f"/api/jobs/{job_id}/status", json={"status": "canceled"}, headers=auth_header(user_token))
    r = client.get("/api/jobs/active", headers=auth_header(user_token))
    assert r.get_json() is None


def test_rate_job_once_after_finished(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job()
    client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(user_token))
    client.patch(
        f"/api/jobs/{job_id}/status", json={"status": "finished", "paymentType": "cash"}, headers=auth_header(user_token)
    )

    r = client.post(f"/api/jobs/{job_id}/rate", json={"stars": 5, "comment": "Great!"}, headers=auth_header(user_token))
    assert r.status_code == 201

    r = client.post(f"/api/jobs/{job_id}/rate", json={"stars": 3}, headers=auth_header(user_token))
    assert r.status_code == 409


def test_cannot_rate_unfinished_job(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job()
    r = client.post(f"/api/jobs/{job_id}/rate", json={"stars": 5}, headers=auth_header(user_token))
    assert r.status_code == 400
    assert r.get_json()["error"]["code"] == "invalid_state"


def test_payout_and_earnings(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id, *_ = make_job(price=100)
    client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(user_token))
    r = client.patch(
        f"/api/jobs/{job_id}/status", json={"status": "finished", "paymentType": "online"}, headers=auth_header(user_token)
    )
    payment_url = r.get_json()["paymentUrl"]
    order_id = payment_url.rsplit("/", 1)[-1]
    client.post("/api/webhooks/paymob", json={"orderId": order_id, "success": True})

    r = client.get("/api/workers/me/earnings", headers=auth_header(worker_token))
    assert r.get_json()["balance"] == 100.0

    r = client.post(f"/api/jobs/{job_id}/payout", headers=auth_header(worker_token))
    assert r.status_code == 201

    r = client.get("/api/workers/me/earnings", headers=auth_header(worker_token))
    assert r.get_json()["balance"] == 0.0
