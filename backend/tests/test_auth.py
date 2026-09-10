def _register_payload(**overrides):
    payload = {
        "username": "alice",
        "phone": "+201111111111",
        "country": "Egypt",
        "governorate": "Cairo",
        "password": "secretpw",
        "role": "user",
    }
    payload.update(overrides)
    return payload


def _verify_phone(client, phone):
    client.post("/api/otp/send", json={"phone": phone})
    client.post("/api/otp/verify", json={"phone": phone, "code": "000000"})


def test_register_requires_verified_phone(client):
    r = client.post("/api/auth/register", json=_register_payload())
    assert r.status_code == 400
    assert r.get_json()["error"]["code"] == "phone_not_verified"


def test_register_user_succeeds_after_otp_verification(client):
    phone = "+201111111111"
    _verify_phone(client, phone)

    r = client.post("/api/auth/register", json=_register_payload(phone=phone))
    assert r.status_code == 201
    body = r.get_json()
    assert body["role"] == "user"
    assert body["token"]


def test_register_worker_requires_work_type_and_bio(client):
    phone = "+201111111112"
    _verify_phone(client, phone)

    r = client.post(
        "/api/auth/register",
        json=_register_payload(username="bob", phone=phone, role="worker"),
    )
    assert r.status_code == 400
    assert "workType" in r.get_json()["error"]["message"]


def test_register_worker_with_shop_requires_shop_location(client):
    phone = "+201111111113"
    _verify_phone(client, phone)

    r = client.post(
        "/api/auth/register",
        json=_register_payload(
            username="carl",
            phone=phone,
            role="worker",
            workType="plumber",
            bio="10 years experience",
            hasShop=True,
        ),
    )
    assert r.status_code == 400
    assert "shopLocation" in r.get_json()["error"]["message"]


def test_register_worker_succeeds(client):
    phone = "+201111111114"
    _verify_phone(client, phone)

    r = client.post(
        "/api/auth/register",
        json=_register_payload(
            username="dave",
            phone=phone,
            role="worker",
            workType="plumber",
            bio="10 years experience",
            hasShop=True,
            shopLocation="Downtown",
        ),
    )
    assert r.status_code == 201
    assert r.get_json()["role"] == "worker"


def test_register_rejects_duplicate_username(client):
    phone1, phone2 = "+201111111115", "+201111111116"
    _verify_phone(client, phone1)
    client.post("/api/auth/register", json=_register_payload(username="eve", phone=phone1))

    _verify_phone(client, phone2)
    r = client.post("/api/auth/register", json=_register_payload(username="eve", phone=phone2))
    assert r.status_code == 409
    assert r.get_json()["error"]["code"] == "username_taken"


def test_login_with_username_and_password(client):
    phone = "+201111111117"
    _verify_phone(client, phone)
    client.post("/api/auth/register", json=_register_payload(username="frank", phone=phone))

    r = client.post(
        "/api/auth/login",
        json={"identifierType": "username", "identifier": "frank", "password": "secretpw"},
    )
    assert r.status_code == 200
    assert r.get_json()["token"]


def test_login_with_phone_and_password(client):
    phone = "+201111111118"
    _verify_phone(client, phone)
    client.post("/api/auth/register", json=_register_payload(username="grace", phone=phone))

    r = client.post(
        "/api/auth/login",
        json={"identifierType": "phone", "identifier": phone, "password": "secretpw"},
    )
    assert r.status_code == 200


def test_login_rejects_wrong_password(client):
    phone = "+201111111119"
    _verify_phone(client, phone)
    client.post("/api/auth/register", json=_register_payload(username="heidi", phone=phone))

    r = client.post(
        "/api/auth/login",
        json={"identifierType": "username", "identifier": "heidi", "password": "wrongpw"},
    )
    assert r.status_code == 401
    assert r.get_json()["error"]["code"] == "invalid_credentials"


def test_otp_send_is_rate_limited_on_second_attempt(client):
    phone = "+201111111120"
    r = client.post("/api/otp/send", json={"phone": phone})
    assert r.status_code == 200

    r = client.post("/api/otp/send", json={"phone": phone})
    assert r.status_code == 429
    assert r.get_json()["error"]["code"] == "rate_limited"
    assert "retryAfter" in r.get_json()["error"]


def test_otp_verify_resets_rate_limit(client):
    phone = "+201111111121"
    client.post("/api/otp/send", json={"phone": phone})
    client.post("/api/otp/verify", json={"phone": phone, "code": "000000"})

    r = client.post("/api/otp/send", json={"phone": phone})
    assert r.status_code == 200
