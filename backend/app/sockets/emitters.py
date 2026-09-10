"""Typed helper functions for every WebSocket event in BACKEND_PLAN.md §10.

Route/service code should always go through these instead of hand-building
socket payloads inline, so event names and shapes stay centralized.
"""

from app.extensions import socketio


def emit_new_request(work_type: str, request_payload: dict):
    socketio.emit("new_request", {"request": request_payload}, room=f"worktype:{work_type}")


def emit_request_closed(work_type: str, request_id: str):
    socketio.emit("request_closed", {"requestId": request_id}, room=f"worktype:{work_type}")


def emit_new_offer(user_id: str, request_id: str, offer_payload: dict):
    # Notify the user's personal room (for global in-app notifications)
    socketio.emit("new_offer", {"offer": offer_payload}, room=f"user:{user_id}")
    # Also notify the request-scoped room (for the live-offers view, supports multiple concurrent requests)
    socketio.emit("new_offer", {"offer": offer_payload}, room=f"request:{request_id}")



def emit_offer_chosen(worker_id: str, job_id: str):
    socketio.emit("offer_chosen", {"jobId": job_id}, room=f"user:{worker_id}")


def emit_offer_rejected(worker_id: str, request_id: str):
    socketio.emit("offer_rejected", {"requestId": request_id}, room=f"user:{worker_id}")


def emit_job_status_changed(user_id: str, worker_id: str, job_id: str, status: str):
    payload = {"jobId": job_id, "status": status}
    socketio.emit("job_status_changed", payload, room=f"user:{user_id}")
    socketio.emit("job_status_changed", payload, room=f"user:{worker_id}")


def emit_job_canceled_by_user(worker_id: str, job_id: str):
    socketio.emit("job_canceled_by_user", {"jobId": job_id}, room=f"user:{worker_id}")


def emit_job_canceled_by_worker(user_id: str, job_id: str):
    socketio.emit("job_canceled_by_worker", {"jobId": job_id}, room=f"user:{user_id}")


def emit_payment_confirmed(user_id: str, worker_id: str, job_id: str, amount: float):
    payload = {"jobId": job_id, "amount": amount}
    socketio.emit("payment_confirmed", payload, room=f"user:{user_id}")
    socketio.emit("payment_confirmed", payload, room=f"user:{worker_id}")


def emit_payment_failed(user_id: str, job_id: str):
    """Not in BACKEND_PLAN.md §10's original event table — added per §6's instruction
    that the Paymob webhook failure path needs "an error-capable event so the frontend
    can offer retry". Sent only to the user, since only they can retry `finish`."""
    socketio.emit("payment_failed", {"jobId": job_id}, room=f"user:{user_id}")
