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
        return False  # reject unauthenticated connections

    try:
        decoded = decode_token(token)
    except Exception:
        return False

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
