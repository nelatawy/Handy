"""Verifies the Socket.IO room-broadcast fan-out (BACKEND_PLAN.md §8's
"load-test the WebSocket room-broadcast path" item).

This is a correctness/fan-out test at unit-test scale (a handful of concurrent
socket clients in-process), not a true load test against a running server under
network conditions — that requires a dedicated tool (e.g. Locust with a
Socket.IO client) against a deployed instance, which is out of scope for this
test suite. What's verified here: N matching workers all receive a broadcast,
and non-matching workers/other rooms are correctly excluded.
"""

from app.extensions import socketio
from app.models.enums import WorkType


def _event_names(received):
    return [e["name"] for e in received]


def test_new_request_fans_out_only_to_matching_worktype_room(app, client, make_user, auth_header):
    _, plumber1_token = make_user("worker", work_type=WorkType.PLUMBER)
    _, plumber2_token = make_user("worker", work_type=WorkType.PLUMBER)
    _, plumber3_token = make_user("worker", work_type=WorkType.PLUMBER)
    _, electrician_token = make_user("worker", work_type=WorkType.ELECTRICIAN)
    _, user_token = make_user("user")

    plumbers = [socketio.test_client(app, auth={"token": t}) for t in (plumber1_token, plumber2_token, plumber3_token)]
    electrician = socketio.test_client(app, auth={"token": electrician_token})

    assert all(p.is_connected() for p in plumbers)
    assert electrician.is_connected()

    r = client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(user_token),
    )
    assert r.status_code == 201

    for p in plumbers:
        assert "new_request" in _event_names(p.get_received())
    assert "new_request" not in _event_names(electrician.get_received())

    for p in plumbers:
        p.disconnect()
    electrician.disconnect()


def test_unauthenticated_socket_connection_rejected(app):
    test_client = socketio.test_client(app)
    assert not test_client.is_connected()


def test_offer_chosen_notifies_only_the_winning_worker(app, client, make_user, auth_header):
    _, user_token = make_user("user")
    _, winner_token = make_user("worker")
    _, loser_token = make_user("worker")

    winner_socket = socketio.test_client(app, auth={"token": winner_token})
    loser_socket = socketio.test_client(app, auth={"token": loser_token})

    r = client.post(
        "/api/requests",
        json={"description": "Fix sink", "workType": "plumber", "images": []},
        headers=auth_header(user_token),
    )
    request_id = r.get_json()["requestId"]

    r = client.post(f"/api/requests/{request_id}/offer", json={"price": 100}, headers=auth_header(winner_token))
    winner_offer_id = r.get_json()["offerId"]
    client.post(f"/api/requests/{request_id}/offer", json={"price": 90}, headers=auth_header(loser_token))

    winner_socket.get_received()  # drain new_request/new_offer noise
    loser_socket.get_received()

    client.post(f"/api/requests/{request_id}/choose", json={"offerId": winner_offer_id}, headers=auth_header(user_token))

    assert "offer_chosen" in _event_names(winner_socket.get_received())
    assert "offer_rejected" in _event_names(loser_socket.get_received())

    winner_socket.disconnect()
    loser_socket.disconnect()
