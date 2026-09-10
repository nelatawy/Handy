from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import join_room

from app.extensions import socketio


def _extract_token(auth):
    if isinstance(auth, dict) and auth.get("token"):
        return auth["token"]
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header.split(" ", 1)[1]
    return None


@socketio.on("connect")
def handle_connect(auth=None):
    token = _extract_token(auth)
    if not token:
        raise ConnectionRefusedError("Authentication required")  # reject unauthenticated connections

    try:
        decoded = decode_token(token)
    except Exception:
        raise ConnectionRefusedError("Invalid or expired token")

    user_id = decoded.get("sub")
    role = decoded.get("role")

    join_room(f"user:{user_id}")
    if role == "worker":
        work_type = decoded.get("work_type")
        if work_type:
            join_room(f"worktype:{work_type}")

    return True


@socketio.on("disconnect")
def handle_disconnect():
    pass


@socketio.on("join_request_room")
def handle_join_request_room(data):
    """Allow a client to subscribe to real-time offer updates for a specific request.

    The client emits: { requestId: "<uuid>" }
    The socket connection was already authenticated at connect time,
    so we simply join the scoped room here.
    """
    request_id = (data or {}).get("requestId")
    if request_id:
        join_room(f"request:{request_id}")


@socketio.on("leave_request_room")
def handle_leave_request_room(data):
    """Allow a user to unsubscribe from a request room when they navigate away."""
    from flask_socketio import leave_room

    request_id = (data or {}).get("requestId")
    if request_id:
        leave_room(f"request:{request_id}")
