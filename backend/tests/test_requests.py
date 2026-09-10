def test_create_request_requires_user_role(client, make_user, auth_header):
    _, worker_token = make_user("worker")
    r = client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(worker_token),
    )
    assert r.status_code == 403


def test_create_request_rejects_more_than_5_images(client, make_user, auth_header):
    _, user_token = make_user("user")
    r = client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": [f"http://x/{i}.jpg" for i in range(6)]},
        headers=auth_header(user_token),
    )
    assert r.status_code == 400


def test_get_request_accessible_by_owner_and_any_worker(client, make_user, auth_header):
    _, user_token = make_user("user")
    _, worker_token = make_user("worker")
    _, other_user_token = make_user("user")

    r = client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(user_token),
    )
    request_id = r.get_json()["requestId"]

    r = client.get(f"/api/requests/{request_id}", headers=auth_header(user_token))
    assert r.status_code == 200
    assert r.get_json()["id"] == request_id

    r = client.get(f"/api/requests/{request_id}", headers=auth_header(worker_token))
    assert r.status_code == 200

    r = client.get(f"/api/requests/{request_id}", headers=auth_header(other_user_token))
    assert r.status_code == 403


def test_worker_sees_matching_open_request(client, make_user, auth_header):
    _, user_token = make_user("user")
    _, worker_token = make_user("worker")

    client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(user_token),
    )

    r = client.get("/api/workers/me/requests", headers=auth_header(worker_token))
    assert r.status_code == 200
    assert len(r.get_json()) == 1
    assert r.get_json()[0]["workType"] == "plumber"


def test_worker_does_not_see_mismatched_work_type(client, make_user, auth_header):
    from app.models.enums import WorkType

    _, user_token = make_user("user")
    _, electrician_token = make_user("worker", work_type=WorkType.ELECTRICIAN)

    client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(user_token),
    )

    r = client.get("/api/workers/me/requests", headers=auth_header(electrician_token))
    assert r.get_json() == []


def test_offer_computes_fee_server_side(client, make_user, auth_header):
    _, user_token = make_user("user")
    _, worker_token = make_user("worker")

    r = client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(user_token),
    )
    request_id = r.get_json()["requestId"]

    r = client.post(
        f"/api/requests/{request_id}/offer",
        json={"price": 100},
        headers=auth_header(worker_token),
    )
    assert r.status_code == 201
    assert r.get_json()["priceWithFee"] == 105.0


def test_worker_cannot_respond_twice(client, make_user, auth_header):
    _, user_token = make_user("user")
    _, worker_token = make_user("worker")

    r = client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(user_token),
    )
    request_id = r.get_json()["requestId"]

    client.post(f"/api/requests/{request_id}/offer", json={"price": 100}, headers=auth_header(worker_token))
    r = client.post(f"/api/requests/{request_id}/offer", json={"price": 150}, headers=auth_header(worker_token))
    assert r.status_code == 400
    assert r.get_json()["error"]["code"] == "already_responded"


def test_decline_removes_request_from_worker_feed(client, make_user, auth_header):
    _, user_token = make_user("user")
    _, worker_token = make_user("worker")

    r = client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(user_token),
    )
    request_id = r.get_json()["requestId"]

    client.post(f"/api/requests/{request_id}/decline", headers=auth_header(worker_token))

    r = client.get("/api/workers/me/requests", headers=auth_header(worker_token))
    assert r.get_json() == []


def test_choose_offer_creates_job_and_rejects_siblings(client, make_user, auth_header):
    _, user_token = make_user("user")
    _, worker1_token = make_user("worker")
    _, worker2_token = make_user("worker")

    r = client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(user_token),
    )
    request_id = r.get_json()["requestId"]

    r1 = client.post(f"/api/requests/{request_id}/offer", json={"price": 100}, headers=auth_header(worker1_token))
    offer1_id = r1.get_json()["offerId"]
    client.post(f"/api/requests/{request_id}/offer", json={"price": 120}, headers=auth_header(worker2_token))

    r = client.post(f"/api/requests/{request_id}/choose", json={"offerId": offer1_id}, headers=auth_header(user_token))
    assert r.status_code == 200
    assert r.get_json()["jobId"]

    r = client.get(f"/api/requests/{request_id}/offers", headers=auth_header(user_token))
    statuses = {o["id"]: o["status"] for o in r.get_json()}
    assert statuses[offer1_id] == "chosen"


def test_cannot_choose_from_closed_request(client, make_user, auth_header):
    _, user_token = make_user("user")
    _, worker_token = make_user("worker")

    r = client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(user_token),
    )
    request_id = r.get_json()["requestId"]

    r = client.post(f"/api/requests/{request_id}/offer", json={"price": 100}, headers=auth_header(worker_token))
    offer_id = r.get_json()["offerId"]

    client.post(f"/api/requests/{request_id}/choose", json={"offerId": offer_id}, headers=auth_header(user_token))
    r = client.post(f"/api/requests/{request_id}/choose", json={"offerId": offer_id}, headers=auth_header(user_token))
    assert r.status_code == 400
    assert r.get_json()["error"]["code"] == "request_closed"


def test_cancel_only_allowed_while_open(client, make_user, auth_header):
    _, user_token = make_user("user")
    _, worker_token = make_user("worker")

    r = client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(user_token),
    )
    request_id = r.get_json()["requestId"]

    r = client.post(f"/api/requests/{request_id}/offer", json={"price": 100}, headers=auth_header(worker_token))
    offer_id = r.get_json()["offerId"]
    client.post(f"/api/requests/{request_id}/choose", json={"offerId": offer_id}, headers=auth_header(user_token))

    r = client.post(f"/api/requests/{request_id}/cancel", headers=auth_header(user_token))
    assert r.status_code == 400
    assert r.get_json()["error"]["code"] == "invalid_state"


def test_ai_suggest_returns_valid_work_type(client, make_user, auth_header):
    _, user_token = make_user("user")
    r = client.post("/api/ai-suggest", json={"description": "leaky pipe"}, headers=auth_header(user_token))
    assert r.status_code == 200
    body = r.get_json()
    assert body["recommendedWorkType"] in ["plumber", "electrician", "carpenter", "it"]
