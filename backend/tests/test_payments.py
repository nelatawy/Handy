def _finish_job_online(client, make_job, auth_header, price=100):
    user, user_token, worker, worker_token, job_id, *_ = make_job(price=price)
    client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(user_token))
    r = client.patch(
        f"/api/jobs/{job_id}/status", json={"status": "finished", "paymentType": "online"}, headers=auth_header(user_token)
    )
    order_id = r.get_json()["paymentUrl"].rsplit("/", 1)[-1]
    client.post("/api/webhooks/paymob", json={"orderId": order_id, "success": True})
    return user, user_token, worker, worker_token, job_id


def _finish_job_cash(client, make_job, auth_header, price=100):
    user, user_token, worker, worker_token, job_id, *_ = make_job(price=price)
    client.patch(f"/api/jobs/{job_id}/status", json={"status": "started"}, headers=auth_header(user_token))
    client.patch(
        f"/api/jobs/{job_id}/status", json={"status": "finished", "paymentType": "cash"}, headers=auth_header(user_token)
    )
    return user, user_token, worker, worker_token, job_id


def test_payment_history_reflects_online_payment(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id = _finish_job_online(client, make_job, auth_header, price=200)

    r = client.get("/api/payments/history", headers=auth_header(user_token))
    assert r.status_code == 200
    body = r.get_json()
    assert body["total"] == 1
    tx = body["transactions"][0]
    assert tx["jobId"] == job_id
    assert tx["amount"] == 210.0
    assert tx["method"] == "online"
    assert tx["status"] == "paid"


def test_payment_history_only_shows_own_payments(client, make_job, auth_header, make_user):
    _finish_job_online(client, make_job, auth_header)
    _other_user, other_token = make_user("user")

    r = client.get("/api/payments/history", headers=auth_header(other_token))
    assert r.get_json()["transactions"] == []


def test_cash_jobs_excluded_from_worker_balance(client, make_job, auth_header):
    user, user_token, worker, worker_token, job_id = _finish_job_cash(client, make_job, auth_header, price=100)

    r = client.get("/api/workers/me/earnings", headers=auth_header(worker_token))
    assert r.get_json()["balance"] == 0.0
    assert r.get_json()["transactions"] == []


def test_payout_fails_with_no_balance(client, make_user, auth_header, make_job):
    _user, _user_token, worker, worker_token, job_id, *_ = make_job()

    r = client.post(f"/api/jobs/{job_id}/payout", headers=auth_header(worker_token))
    assert r.status_code == 400
    assert r.get_json()["error"]["code"] == "no_balance"


def test_payout_requires_owning_worker(client, make_job, make_user, auth_header):
    user, user_token, worker, worker_token, job_id = _finish_job_online(client, make_job, auth_header)
    _other_worker, other_token = make_user("worker")

    r = client.post(f"/api/jobs/{job_id}/payout", headers=auth_header(other_token))
    assert r.status_code == 403
