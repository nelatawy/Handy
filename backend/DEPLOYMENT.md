# Handy Backend — Deployment Checklist

Per `BACKEND_PLAN.md` §8. Not yet executed against a real environment — this is the
checklist to work through before a real deploy, not a record of one already done.

## Application server
- [ ] Run under `gunicorn` with an `eventlet` (or `gevent`) worker class — `flask-socketio`
      needs an async-capable worker, not the sync default. Example:
      `gunicorn --worker-class eventlet -w 1 "app:create_app()"`
- [ ] Confirm `SOCKETIO_ASYNC_MODE` is left at its default (`eventlet`) in every non-test
      environment — `app/config.py`'s `TestConfig` is the only place it's overridden to
      `threading`, and only so the Socket.IO test client behaves deterministically in
      `pytest` (see `tests/test_sockets.py` for why).

## Scaling beyond one instance
- [ ] If running more than one app instance/worker process, configure `flask-socketio`'s
      `message_queue=` (Redis is the simplest option) so Socket.IO events broadcast across
      instances — without it, a client connected to instance A never sees an event emitted
      from a request handled by instance B.
- [ ] Alternatively, use sticky sessions at the load balancer so a given Socket.IO client
      always reconnects to the same instance (simpler, but caps horizontal scaling of
      realtime fan-out).

## Configuration / secrets
- [ ] `DATABASE_URL` points at the real Supabase Postgres instance (not SQLite).
- [ ] `JWT_SECRET_KEY` and `SECRET_KEY` are real, high-entropy secrets — not the `change-me`
      defaults in `app/config.py`. (Test runs will show `InsecureKeyLengthWarning` for the
      default; that warning must not appear in production logs.)
- [ ] `FRONTEND_URL` is set to the deployed frontend's exact origin — this both drives CORS
      (`flask-cors`) and the Socket.IO `cors_allowed_origins`, and is used to build the
      Paymob checkout return URL.
- [ ] `AUTHEVO_MODE`, `PAYMOB_MODE` are explicitly set to `live` (or `sandbox` for a staging
      deploy) — **never rely on the `mock` default surviving into a real environment.** Each
      provider module (`app/providers/authevo.py`, `paymob.py`, `gemini.py`) currently raises
      `NotImplementedError` on any non-mock call, so live mode requires implementing those
      branches first — this is not yet done (see `api-contract.md`'s "Known limitations").
- [ ] `AUTHEVO_API_KEY`, `GEMINI_API_KEY`, `PAYMOB_API_KEY`/`PAYMOB_INTEGRATION_ID`/
      `PAYMOB_HMAC_SECRET` are populated from the deployment's secret store, not committed
      anywhere (`.env.example` documents the full list of required vars, with none filled in).

## Database
- [ ] Run `flask db upgrade` (Alembic, via `flask-migrate`) against the real Postgres
      instance — no migration has been generated/applied yet (`BACKEND_PLAN.md` §3 flags
      this as blocked on real `DATABASE_URL` credentials during development).
- [ ] Do **not** run `scripts/seed.py` against a production database — it refuses to run if
      any `users` row already exists, but it's still intended for local/staging data only.

## Verification before flipping traffic
- [ ] `pytest` passes with zero live credentials set (already true as of Phase 6 — 47/47
      tests green using only `mock` providers and an in-memory SQLite DB).
- [ ] Manually exercise one full cycle end-to-end against the real deployed stack (both
      payment paths) before considering the deploy done — the test suite covers logic
      correctness, not that the real Paymob/AuthEvo/Gemini integrations actually work,
      since those remain `NotImplementedError` until wired up.
