# Handy — Backend Development Plan

> **Stack:** Python · Flask (blueprints) · `flask-socketio` (Socket.IO, matches frontend's `socket.io-client`) · PostgreSQL (Supabase-hosted, accessed directly via SQLAlchemy ORM + Alembic — **not** the Supabase REST client, see §1 amendment) · `flask-jwt-extended` · Paymob (sandbox, hosted-checkout redirect) · AuthEvo (WhatsApp OTP + Telegram fallback) · Gemini Flash
> **This file is the single source of truth for backend progress and is reconciled against `FRONTEND_PLAN.md`, which is already partway built (Phases 1–2 done). Where the original `BACKEND_PROMPT.md` conflicted with what the frontend already committed to, the frontend's contract wins — see §11.**

---

## Table of Contents

1. [Architecture & Key Decisions](#1-architecture--key-decisions)
2. [Project Scaffolding](#2-project-scaffolding)
3. [Phase 1 — Foundation](#3-phase-1--foundation)
4. [Phase 2 — Auth & OTP](#4-phase-2--auth--otp)
5. [Phase 3 — Requests & Offers (Realtime)](#5-phase-3--requests--offers-realtime)
6. [Phase 4 — Job Lifecycle, Realtime & Payment Trigger](#6-phase-4--job-lifecycle-realtime--payment-trigger)
7. [Phase 5 — Payments, Payouts, Ratings & Profiles](#7-phase-5--payments-payouts-ratings--profiles)
8. [Phase 6 — Docs, Testing, Seed & Deploy Readiness](#8-phase-6--docs-testing-seed--deploy-readiness)
9. [API Contract (reconciled, authoritative)](#9-api-contract-reconciled-authoritative)
10. [WebSocket Events (reconciled, authoritative)](#10-websocket-events-reconciled-authoritative)
11. [Reconciliation Log — deltas from `BACKEND_PROMPT.md`](#11-reconciliation-log--deltas-from-backend_promptmd)
12. [Open Questions / Decision Log](#12-open-questions--decision-log)

---

## 1. Architecture & Key Decisions

| Concern | Decision |
|---|---|
| **Web framework** | Flask, organized as blueprints: `auth`, `otp`, `requests`, `offers`, `jobs`, `payments`, `ratings`, `workers`, `ai`, `webhooks` |
| **DB access** | **SQLAlchemy ORM**, connecting directly to the Supabase-hosted Postgres instance via `DATABASE_URL` (not the Supabase REST/Python client — superseded during implementation, see this row). Alembic (via `flask-migrate`) manages schema migrations against the same connection. **Storage uploads still happen client-side** (see below), so the backend never touches the Supabase Storage SDK for the request-creation flow |
| **Auth** | `flask-jwt-extended`, `bcrypt` password hashing. JWT payload: `{ sub: user_id, role: 'user'\|'worker' }`. No refresh-token flow for v1 (long-lived access token; revisit if needed) |
| **Realtime** | `flask-socketio` with `eventlet` (or `gevent`) worker. Socket auth: client connects with the JWT (as an `auth` payload or query param on connect); server verifies and joins the socket to a `user:{id}` room, plus `worktype:{type}` room if role=worker. **Event names match what the frontend's `WebSocketService` already expects — see §10, not the dot-notation originally drafted in `BACKEND_PROMPT.md`** |
| **AI Suggestion** | Gemini Flash via REST (`google-genai` or plain `requests`), wrapped in a `providers/gemini.py` module so it's mockable offline |
| **Payments** | Paymob sandbox, **hosted-checkout redirect** (not iframe) — confirmed by frontend decision log. Charge is a two-step async flow: backend creates a Paymob order + payment key and returns a checkout URL; the actual charge is confirmed later via the `POST /api/webhooks/paymob` webhook, not synchronously in the `finish` call. **New:** a `cash` payment path is also supported (see §11.1) — this did not exist in the original backend prompt |
| **OTP** | AuthEvo, wrapped behind `providers/authevo.py` (`send_otp`, `verify_otp`, `link_telegram`), with a `sandbox`/`mock` mode driven by `AUTHEVO_MODE` env var so the rest of the system works without live credentials |
| **`work_type` enum** | Postgres enum (`plumber`, `electrician`, `carpenter`, `it`) mirrored exactly by a Python `enum.Enum`, matching the frontend's TS enum values byte-for-byte |
| **JSON casing at the API boundary** | **Frontend contracts (Sections 9–10 of `FRONTEND_PLAN.md`) use camelCase field names** (`workType`, `hasShop`, `shopLocation`, `paymentType`…), while the DB/ORM stays snake_case internally per the original schema. Resolution: a thin serialization layer (Marshmallow schemas, or a `camelize`/`decamelize` request/response middleware) converts at the edge. **This was not addressed in the original backend prompt and must be built explicitly, or every endpoint will silently mismatch the frontend** |
| **Phone number storage** | E.164 only (`phone_number`). The frontend's register payload only sends a single combined `phone` field (country-prefix + number already merged client-side by the Country Prefix Dropdown component) — the standalone `country_prefix` column from the original schema is **derived server-side** from the E.164 string (via `phonenumbers` lib) rather than accepted as separate client input, to avoid two sources of truth going out of sync |
| **Country / Governorate validation** | Frontend bundles a static `geo-data.ts` (Egypt's 27 governorates, Saudi, UAE, etc.) and does **not** expect the backend to serve this list. Backend still validates `country`/`governorate` server-side against **its own mirrored static list** (`app/data/geo_data.py`) kept in sync with the frontend's file — flagged in §12 as a manual-sync risk worth automating later |
| **Image handling on request creation** | Frontend uploads images **directly to Supabase Storage** from the browser and sends the resulting public/signed URLs in `POST /api/requests`. The backend **never receives raw files** for this flow — it just validates and stores the URL array (max 5, per frontend's resolved limit) |

### Folder Structure (planned)

```
backend/
├── app/
│   ├── __init__.py              # app factory, blueprint registration, CORS, JWT, SocketIO init
│   ├── config.py                # env-driven config classes (Dev/Test/Prod)
│   ├── extensions.py            # db, jwt, socketio, bcrypt singletons
│   ├── models/
│   │   ├── user.py
│   │   ├── worker_profile.py
│   │   ├── request.py           # Request, RequestImage
│   │   ├── offer.py
│   │   ├── job.py
│   │   ├── rating.py
│   │   ├── payment.py
│   │   ├── payout.py
│   │   ├── otp.py               # OtpVerification, TelegramLink
│   │   └── enums.py             # WorkType, RequestStatus, OfferStatus, JobStatus, PaymentMethod, PaymentStatus
│   ├── schemas/                 # Marshmallow schemas — camelCase <-> snake_case boundary
│   │   ├── auth_schemas.py
│   │   ├── request_schemas.py
│   │   ├── job_schemas.py
│   │   ├── payment_schemas.py
│   │   └── worker_schemas.py
│   ├── blueprints/
│   │   ├── auth/                # register, login
│   │   ├── otp/                 # send, verify
│   │   ├── requests/            # create, list offers, choose, cancel
│   │   ├── offers/              # worker feed, accept-flow, offer, decline
│   │   ├── jobs/                # status transitions, worker-cancel, payout, get, active
│   │   ├── payments/            # history, webhook
│   │   ├── ratings/
│   │   ├── users/               # GET/PUT /api/users/me (normal user self-profile)
│   │   ├── workers/             # public + /me profile
│   │   └── ai/                  # ai-suggest
│   ├── providers/               # external-service adapters, all mockable
│   │   ├── authevo.py
│   │   ├── paymob.py
│   │   └── gemini.py
│   ├── sockets/
│   │   ├── __init__.py          # connect/disconnect handlers, room join logic
│   │   └── emitters.py          # typed helper functions: emit_new_request(), emit_job_status_changed(), etc.
│   ├── services/                # business logic, kept out of route handlers
│   │   ├── auth_service.py
│   │   ├── request_service.py
│   │   ├── job_service.py
│   │   ├── payment_service.py
│   │   ├── rating_service.py
│   │   └── otp_service.py
│   ├── decorators.py            # @user_required, @worker_required, @role_required
│   └── data/
│       └── geo_data.py          # mirrored country/governorate list
├── migrations/                  # Alembic
├── scripts/
│   └── seed.py                  # fixtures: sample users/workers + a full request→offer→job→rating cycle
├── tests/
│   ├── test_auth.py
│   ├── test_requests.py
│   ├── test_jobs.py
│   ├── test_payments.py
│   └── conftest.py              # fixtures, mocked providers
├── api-contract.md              # generated/maintained, mirrors §9–10 below
├── openapi.yaml
├── requirements.txt
└── .env.example
```

---

## 2. Project Scaffolding

- [x] `flask`, `flask-socketio[eventlet]`, `flask-jwt-extended`, `flask-cors`, `flask-sqlalchemy`, `flask-migrate`, `psycopg2-binary`, `flask-bcrypt`, `marshmallow`, `phonenumbers`, `python-dotenv`, `requests`, `google-generativeai`
- [x] App factory pattern (`create_app(config_name)`) with `SocketIO(app, cors_allowed_origins=..., async_mode='eventlet')`
- [x] `.env.example` documenting every required var: `DATABASE_URL`, `JWT_SECRET_KEY`, `AUTHEVO_API_KEY`, `AUTHEVO_MODE` (`sandbox`/`live`/`mock`), `GEMINI_API_KEY`, `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_HMAC_SECRET`, `PAYMOB_MODE`, `FRONTEND_URL` (for Paymob return-URL + CORS)
- [x] `providers/*` stubbed with a `mock` mode that returns deterministic fake data so the rest of the team can build against it without live keys
- [x] `requirements.txt` pinned

---

## 3. Phase 1 — Foundation

### Database Schema (migrations)
- [x] Postgres enums: `work_type`, `request_status`, `offer_status`, `job_status`, `payment_method` (`online`, `cash` — **new**), `payment_status`, `canceled_by` — modeled as Python `enum.Enum` classes in `app/models/enums.py`, mapped via SQLAlchemy `Enum`
- [x] Tables per original schema (`users`, `worker_profiles`, `requests`, `request_images`, `offers`, `jobs`, `ratings`, `payments`, `payouts`, `otp_verifications`, `telegram_links`), with these amendments:
  - `users`: drop standalone `country_prefix` storage as client input; derive-on-write from `phone_number`, still store it for display convenience
  - `jobs`: add `payment_type` (`payment_method` enum, nullable until finish)
  - `payments`: `method` column (`online`/`cash`); `paymob_order_id`/`paymob_transaction_id` nullable (unused for cash)
- [x] Unique constraints: `ratings.job_id` (one rating per job), `offers (request_id, worker_id)`
- [x] Indexes: `requests.work_type` + `status` (feed queries), `jobs.user_id`, `jobs.worker_id`
- [ ] Actual Alembic migration generated & applied against a real Postgres/Supabase instance (blocked on `DATABASE_URL` credentials — models are ready via `flask db migrate` once configured)

### App Core
- [x] Config classes (Dev/Test/Prod) reading all env vars from §2
- [x] Global error handler → consistent JSON error shape `{ error: { code, message } }`
- [x] CORS restricted to `FRONTEND_URL`
- [x] Marshmallow base schema mixin that auto-converts snake_case ↔ camelCase, used by every blueprint
- [x] `decorators.py`: `@jwt_required()` wrappers for `@user_required` / `@worker_required`
- [x] SocketIO connect handler: reads JWT from the client's `auth` payload, joins `user:{id}` room (+ `worktype:{type}` if worker); rejects unauthenticated connections
- [x] `sockets/emitters.py`: one typed function per event in §10 so route/service code never hand-builds socket payloads inline

### Provider Stubs
- [x] `providers/authevo.py`: `send_otp(phone) -> OtpSendResult`, `verify_otp(phone, code) -> bool`, `link_telegram(phone) -> TelegramLinkResult`; mock mode always "succeeds" and logs instead of calling AuthEvo
- [x] `providers/paymob.py`: `create_checkout(job, amount) -> checkout_url`, `verify_webhook_signature(payload, hmac) -> bool`, `create_payout(worker, amount) -> reference`; mock mode returns a fake checkout URL (auto-fired local webhook for dev testing left for Phase 4, when the webhook route exists)
- [x] `providers/gemini.py`: `suggest(description) -> (polished_description, recommended_work_type)`; mock mode does simple string passthrough

---

## 4. Phase 2 — Auth & OTP

- [x] `POST /api/otp/send` — normalizes phone to E.164, calls AuthEvo, persists `otp_verifications` row. On AuthEvo `409 CHANNEL_NOT_LINKED`, returns **HTTP 200** with `channel: 'telegram'` + `telegramBotUrl` (per original backend prompt's "don't treat this as a hard failure" — the frontend's OTP component branches on `channel`, not on HTTP status). Wired via a `ChannelNotLinkedError` the provider can raise; mock mode never raises it (always succeeds over WhatsApp), so this branch only fires once live AuthEvo integration is implemented
- [x] `POST /api/otp/verify` — verifies via AuthEvo, marks the row verified. On first-ever successful verification for a phone number, fires `link_telegram` in the background and upserts `telegram_links` (idempotent)
- [x] `POST /api/auth/register` — role-conditional validation (worker requires `workType`, `bio`, `hasShop`, and `shopLocation` if `hasShop`); requires a verified, unexpired OTP row for the submitted phone; validates `country`/`governorate` against `app/data/geo_data.py`; hashes password; creates `users` (+ `worker_profiles` if worker) in one transaction; **returns `{ token, role }` on success** (auto-login, per frontend's resolved decision — the response shape in the frontend's own contract table said `{ message }`, which is stale; the decision log is authoritative)
- [x] `POST /api/auth/login` — `identifierType` (`username`|`phone`) + `identifier` + `password`; **no OTP step** (frontend resolved this as password-only); returns `{ token, role }`
- [x] Rate-limit `otp/send` per phone number to prevent AuthEvo abuse — exponential backoff (`otp_rate_limits` table): 30s, 60s, 120s, ... doubling per send, capped at 1 day; resets to unlocked on successful verification. Returns `429` with `retryAfter` (seconds) + a `Retry-After` header while locked

---

## 5. Phase 3 — Requests & Offers (Realtime)

- [x] `POST /api/requests` — `description` (non-empty), `workType`, `images[]` (URLs already uploaded to Supabase Storage by the client, max 5 — validated server-side too, not just trusted from the frontend). Creates `requests` + `request_images` rows, status `open`. Emits `new_request` to the `worktype:{type}` room
- [x] `POST /api/ai-suggest` — calls Gemini, returns `{ suggestedDescription, recommendedWorkType }` (`recommendedWorkType` guaranteed to be a valid enum value — validate/clamp Gemini's output before returning it)
- [x] `GET /api/requests/:id/offers` — current offers for reconnect/initial load
- [x] `GET /api/workers/me/requests` — open requests matching the worker's `work_type`
- [x] `POST /api/requests/:id/offer` — worker submits `price`; server computes `price * 1.05` for display, **never trusts a client-sent total**; creates `offers` row (`pending`); emits `new_offer` to `user:{request.user_id}`. **No separate `/accept` call** — "Accept" on the frontend is a client-side navigation to the pricing screen only (see §11.4); only `/offer` and `/decline` touch the backend
- [x] `POST /api/requests/:id/decline` — marks this worker out of consideration for the request (so it drops from their own feed on refresh). Implemented as a `rejected`-status `offers` row (price 0) so the `(request_id, worker_id)` unique constraint also prevents double-responding
- [x] `POST /api/requests/:id/choose` — body `{ offerId }` (**not** `workerId` — see §11.2). Marks the chosen offer `chosen`, all sibling offers `rejected`, request → `offer_selected`, creates `jobs` row (`pending`). Emits `offer_chosen` to the winning worker, `offer_rejected` to the losing ones, `request_closed` to the rest of the `worktype` room. Returns `{ jobId }`
- [x] `POST /api/requests/:id/cancel` — only while `open` (no offer chosen yet); marks `cancelled`
- [x] `GET /api/requests/mine` — added alongside the above (listed in §9 but missing its own checklist line); returns the caller's own requests

---

## 6. Phase 4 — Job Lifecycle, Realtime & Payment Trigger

Two distinct endpoints, matching what the frontend plan actually describes on each side (see §11.3 for why these aren't unified into one):

- [x] `PATCH /api/jobs/:id/status` — **user-only**. Body `{ status: 'started'|'finished'|'canceled', paymentType?: 'online'|'cash' }`
  - `pending → started`: sets `started_at`; emits `job_status_changed`; no money
  - `started → finished`: **the single point payment logic runs** (see below); `paymentType` required
  - `pending/started → canceled`: `canceled_by='user'`; emits `job_status_changed` **and** `job_canceled_by_user` (to the worker, for distinct messaging, mirroring the worker-cancel side); no money ever moved, so nothing to reverse. Added a `jobs.canceled_at` column (missing from the Phase 1 model) since the state machine needs it
- [x] `POST /api/jobs/:id/cancel` — **worker-only**, allowed from `pending`/`started`. `canceled_by='worker'`. Emits `job_canceled_by_worker` to the user (distinct event so the frontend can render "the handyman canceled" messaging, per its own plan)

### Finish + Payment logic (the critical path)
- [x] Recompute `total_charged = agreed_price * 1.05` server-side from the stored **offer** price — never from client input
- [x] `paymentType: 'online'` → create a `payments` row (`status='pending'`, `method='online'`), call `paymob.create_checkout(...)`, **return the job (still `started`) plus `paymentUrl`** — job only flips to `finished` once the webhook confirms (async, hosted-checkout flow, per frontend's resolved decision — this is *not* a synchronous charge-and-flip like the original backend prompt sketched)
- [x] `paymentType: 'cash'` → **new path, not in the original backend prompt** — no Paymob call. Synchronously create a `payments` row (`status='paid'`, `method='cash'`), set job → `finished`, `finished_at=now`. Emit `job_status_changed` immediately (this is the trigger the frontend uses to pop the rating modal)
- [x] **Hard invariant, enforced in code:** no `payments` row and no Paymob API call ever exists before `finish` is invoked, for either payment type. No other route may create a `payments` row — `finish_job`/`_finish_with_cash`/`_finish_with_online_checkout` in `job_service.py` are the only code paths that construct a `Payment`
- [x] `POST /api/webhooks/paymob` — verifies HMAC signature, matches the pending `payments` row via `paymob_order_id`, on success: `payments.status='paid'`, `jobs.status='finished'`, credits the worker's completion count (the payable-balance figure itself is a derived sum in Phase 5's `GET /api/workers/me/earnings`, not a stored balance column), emit `payment_confirmed` then `job_status_changed` to both parties. On failure: `payments.status='failed'`, job stays `started`, emits a new `payment_failed` event to the user (not in the original §10 table — added here since §6 explicitly calls for "an error-capable event", and only the user can retry `finish`). **Registered at `/api/webhooks/paymob` via a dedicated `webhooks_bp`**, not nested under `/api/payments`, to match the literal path in §9

---

## 7. Phase 5 — Payments, Payouts, Ratings & Profiles

- [x] `GET /api/payments/history` — needed by the frontend's Transaction History screen. Paginated list of the user's payments with job summary, amount, status, `method`
- [x] `GET /api/workers/me/earnings` — `{ balance, transactions[] }` — balance = sum of `agreed_price` on `finished` jobs with `payment_type='online'` minus prior payouts (cash jobs are excluded — the worker already has that cash in hand; see §12.1 for the fee-collection gap this opens)
- [x] `POST /api/jobs/:id/payout` — worker requests payout of their balance via `paymob.create_payout(...)`; creates a `payouts` row. Added `job_id`/`status` columns to the `payouts` model (present in the original schema doc, missing from the Phase 1 build); mock payouts settle synchronously as `paid`
- [x] `GET /api/workers/me` — self profile (backend prompt only specified the public `GET /api/workers/:id`)
- [x] `PUT /api/workers/me` — Edits `bio`, `hasShop`, `shopLocation`
- [x] `GET /api/workers/:id` — public profile: name, workType, bio, shop info, `averageRating`, `ratingsCount`, `completedJobsCount`
- [x] `POST /api/jobs/:id/rate` — `stars` (1–5, required), `comment` (optional); only by the job's user, only once (`ratings.job_id` unique constraint), only after `status='finished'`. Recomputes `worker_profiles.average_rating`/`ratings_count` transactionally. Added `worker_id`/`user_id` columns to `ratings` (present in the original schema doc, missing from the Phase 1 build) so lookups don't need a join through `jobs`
- [x] `GET /api/workers/:id/ratings` — paginated ratings + summary
- [x] `GET /api/jobs/:id` — fetch a single job by ID. Response: full `Job` object (id, requestId, offerId, userId, workerId, workerName, workType, description, price, userPrice, status, paymentType?, canceledBy?, createdAt, updatedAt). Accessible by both the job's user and worker. **Added from reverse-audit: used by `job.service.ts` → `getJob()`**
- [x] `GET /api/jobs/active` — fetch the caller's currently active job (status `pending` or `started`). Response: single `Job` object or `null`. Role-aware: returns the job where `user_id=current` for users, `worker_id=current` for workers. **Added from reverse-audit: used by `job.service.ts` → `getActiveJob()`**
- [x] `GET /api/users/me` — authenticated normal user's own profile. Response: `{ id, username, phone, country, governorate, role, createdAt }`. **Added from reverse-audit: used by `profile.service.ts` → `getUserProfile()`**
- [x] `PUT /api/users/me` — update editable normal-user profile fields (`username?`, `country?`, `governorate?`). Phone changes excluded (require OTP re-verification). Response: `{ user }`. **Added from reverse-audit: used by `profile.service.ts` → `updateUserProfile()`**
- **New service modules** `worker_service.py` and `user_service.py` were added, not in the original folder listing (§1 only named auth/request/job/payment/rating services), to keep this business logic out of route handlers consistent with the rest of the codebase

---

## 8. Phase 6 — Docs, Testing, Seed & Deploy Readiness

- [x] `api-contract.md` generated from the tables in §9–10 (chose `api-contract.md` over `openapi.yaml` — the prompt allows either; a hand-written contract doc was faster to keep accurate than a generated OpenAPI spec for a backend this size). Lives at `backend/api-contract.md`
- [x] `scripts/seed.py`: sample normal users, sample workers per work type (some with shops), and two fully walked request → offer → choose → start → finish → rate cycles (one online, one cash), plus one open unclaimed request for live-feed testing. Refuses to run against a non-empty DB
- [x] Unit tests per blueprint (`tests/test_auth.py`, `test_requests.py`, `test_jobs.py`, `test_payments.py`); integration coverage for the full job state machine including both payment paths (cash sync, online async+webhook, webhook replay/failure) and both cancel paths
- [x] Mocked-provider test suite runs green with zero live credentials — 47/47 passing with no env vars set at all
- [x] Load-test the WebSocket room-broadcast path — `tests/test_sockets.py` verifies N concurrent matching-worker sockets all receive a broadcast and non-matching workers/rooms are excluded. This is fan-out **correctness** at unit-test scale, not a true load test against a running server under network conditions (would need e.g. Locust with a Socket.IO client against a deployed instance) — documented as out of scope for this suite, not silently skipped
- [x] Deployment checklist — `backend/DEPLOYMENT.md`: `eventlet`/`gevent` worker for SocketIO under gunicorn, sticky sessions or a Redis message queue (`flask-socketio` `message_queue=`) if scaling beyond one instance, CORS origin locked to the deployed frontend URL, all provider modes flipped from `mock`/`sandbox` to `live` deliberately (never by default)
- **Bug fixed along the way:** `flask_socketio`'s `@socketio.on` decorator attaches directly to `self.server` if one already exists at decoration time, instead of queuing in `self.handlers` for replay on future `init_app()` calls. `create_app()` called `socketio.init_app()` before importing the sockets module, so every app instance *after the first* silently had no `connect`/`disconnect` handlers at all — invisible in production (one process, one app), but broke every test using more than one `app` fixture instance. Fixed by importing `app.sockets` before the first `socketio.init_app()` call; also added a `SOCKETIO_ASYNC_MODE` config (defaults `eventlet`, `threading` in `TestConfig`) so the Socket.IO test client behaves deterministically

---

## 9. API Contract (reconciled, authoritative)

> Supersedes the endpoint list in the original `BACKEND_PROMPT.md` and fills the gaps left by the frontend's partial contract table. All request/response bodies are **camelCase** (see §1).

| Method | Endpoint | Body / Params | Response | Notes |
|---|---|---|---|---|
| POST | `/api/otp/send` | `{ phone }` (E.164) | `{ channel: 'whatsapp'\|'telegram', telegramBotUrl?, expiresIn }` | HTTP 200 even on the Telegram-fallback branch |
| POST | `/api/otp/verify` | `{ phone, code }` | `{ verified }` | Triggers background `telegram-link` on first success |
| POST | `/api/auth/register` | `{ username, phone, country, governorate, password, role, workType?, bio?, hasShop?, shopLocation? }` | `{ token, role }` | Requires a verified OTP row for `phone`. Auto-login |
| POST | `/api/auth/login` | `{ identifierType, identifier, password }` | `{ token, role }` | Password-only, no OTP |
| POST | `/api/ai-suggest` | `{ description }` | `{ suggestedDescription, recommendedWorkType }` | |
| POST | `/api/requests` | `{ description, workType, images[] }` | `{ requestId }` | `images[]` are already-uploaded Supabase Storage URLs, max 5 |
| GET | `/api/requests/mine` | — | `Request[]` | |
| GET | `/api/requests/:id/offers` | — | `Offer[]` | Reconnect/initial-load fallback for the live feed |
| POST | `/api/requests/:id/cancel` | — | `{ request }` | Only while `open` |
| GET | `/api/workers/me/requests` | — | `Request[]` | Matches worker's `work_type` |
| POST | `/api/requests/:id/offer` | `{ price }` | `{ offerId, priceWithFee }` | Server computes the 5% fee |
| POST | `/api/requests/:id/decline` | — | `{ success }` | |
| POST | `/api/requests/:id/choose` | `{ offerId }` | `{ jobId }` | By offer, not worker id |
| PATCH | `/api/jobs/:id/status` | `{ status: 'started'\|'finished'\|'canceled', paymentType?: 'online'\|'cash' }` | `{ job, paymentUrl? }` | User-only. `paymentType` required when `status='finished'`. `paymentUrl` present only for `finished`+`online` |
| POST | `/api/jobs/:id/cancel` | — | `{ job }` | **Worker-only** — distinct from the PATCH above |
| POST | `/api/webhooks/paymob` | Paymob payload | `200 OK` | HMAC-verified |
| POST | `/api/jobs/:id/payout` | — | `{ payout }` | |
| GET | `/api/payments/history` | — | `Transaction[]` | Paginated; each item includes `jobId`, `amount`, `method` (`online`\|`cash`), `status` (`pending`\|`paid`\|`failed`), `createdAt` |
| GET | `/api/workers/me/earnings` | — | `{ balance, transactions[] }` | Online jobs only; cash excluded |
| GET | `/api/users/me` | — | `User` | Normal user's own profile. **New — reverse audit** |
| PUT | `/api/users/me` | `{ username?, country?, governorate? }` | `{ user }` | Phone excluded (needs OTP). **New — reverse audit** |
| GET | `/api/workers/me` | — | `Worker` | |
| PUT | `/api/workers/me` | `{ bio?, hasShop?, shopLocation? }` | `{ worker }` | |
| GET | `/api/workers/:id` | — | `Worker` (public) | |
| POST | `/api/jobs/:id/rate` | `{ stars, comment? }` | `{ rating }` | Once per job, user-only, after `finished` |
| GET | `/api/workers/:id/ratings` | `page?` (query param, default 1) | `{ ratings[], average, count }` | |
| GET | `/api/jobs/:id` | — | `Job` | Full job object. Accessible by job's user or worker. **New — reverse audit** |
| GET | `/api/jobs/active` | — | `Job \| null` | Caller's active job (`pending` or `started`). Role-aware. **New — reverse audit** |

---

## 10. WebSocket Events (reconciled, authoritative)

> The frontend's `WebSocketService` (Phase 1, already built) exposes typed observables for these exact event names — **not** the dot-notation (`request.created`, `job.finished`, etc.) drafted in the original `BACKEND_PROMPT.md`. Backend must emit these names verbatim.

| Event | Direction | Payload | Description |
|---|---|---|---|
| `new_request` | Server → matching Workers (`worktype:{type}` room) | `{ request }` | New request broadcast |
| `request_closed` | Server → other matching Workers | `{ requestId }` | Request no longer open (another worker was chosen) |
| `new_offer` | Server → requesting User | `{ offer }` | Worker submitted an offer |
| `offer_chosen` | Server → chosen Worker | `{ jobId }` | This worker was selected |
| `offer_rejected` | Server → losing Workers | `{ requestId }` | Someone else was chosen |
| `job_status_changed` | Server → User + Worker | `{ jobId, status }` | Covers `started` and `finished` transitions (and user-initiated `canceled`) |
| `job_canceled_by_user` | Server → Worker | `{ jobId }` | User canceled the job |
| `job_canceled_by_worker` | Server → User | `{ jobId }` | Worker canceled the job — distinct from the above so the frontend can render different copy |
| `payment_confirmed` | Server → User + Worker | `{ jobId, amount }` | Fired from the Paymob webhook, right before `job_status_changed` → `finished` |
| `payment_failed` | Server → User | `{ jobId }` | **New — Phase 4.** Fired from the Paymob webhook on a failed charge; job stays `started` so the frontend can offer retry |

---

## 11. Reconciliation Log — deltas from `BACKEND_PROMPT.md`

Concrete conflicts found between the original backend prompt / app description and the already-in-progress frontend plan, and the resolution adopted above.

1. **Cash payment method didn't exist in the original spec.** `BACKEND_PROMPT.md` and `APP_DESCRIPTION.md` both describe payment as *exclusively* a Paymob charge on `finish`. The frontend plan has already designed and partially scoped a `PaymentType` enum (`online`/`cash`) with a "Paid in Cash" button that finalizes the job with **no Paymob involvement at all**. Backend schema (`payments.method`, `jobs.payment_type`) and the finish logic in §6 were extended to support this. The unresolved side-effect — platform fee collection on cash jobs — is flagged in §12.1, not silently decided.
2. **`choose` endpoint identifier changed.** Original: `POST /api/requests/:id/choose` body `{ worker_id }`. Frontend already contracts on body `{ offerId }`. Adopted the frontend's version — the offer row is the more precise identifier (a worker could theoretically have offer history across statuses) and it's what the Live Offers screen actually has in hand from the WebSocket payload.
3. **Job state transitions are split across two different endpoint shapes, not four uniform ones.** Original backend prompt had four symmetric REST verbs (`start`, `finish`, `cancel`, `worker-cancel`). The frontend plan already describes the user side as a single `PATCH /api/jobs/{id}/status` and the worker side as its own `POST /api/jobs/{id}/cancel` — an asymmetry that exists in the frontend's own plan, not something introduced here. Backend design in §6 matches it exactly rather than "fixing" it, since the frontend is the side already partially built.
4. **`POST /api/requests/:id/accept` was dropped.** The original backend prompt modeled "accept" (before pricing) as its own persisted state. The frontend's Worker flow only describes "Accept → navigate to pricing screen" as client-side navigation with **no** corresponding network call in its API contract table — only `/offer` (submitting the price) and `/decline` hit the backend. Resolved by removing the standalone accept endpoint rather than forcing an extra unused call the frontend never planned to make.
5. **WebSocket event naming convention.** Original: dot-notation (`request.created`, `job.finished`). Frontend's already-built `WebSocketService` (Phase 1, checked complete) is documented against snake_case event names (`new_request`, `job_status_changed`, etc.) and per-role cancel events that don't exist 1:1 in the original list (`job_canceled_by_user` / `job_canceled_by_worker` vs. a single `job.canceled`). Backend adopts the frontend's names verbatim — see §10.
6. **Register response shape.** The frontend's own §9 contract table says `{ message }`, but its §10 decision log explicitly resolves "auto-login after registration: backend returns JWT." These two parts of the frontend plan contradict each other; treated the decision log as authoritative (more recent, explicitly "Resolved") and specified `{ token, role }` in §9 above.
7. **Image upload path.** Original backend prompt left it ambiguous whether the backend handles the multipart upload to Supabase Storage. Frontend resolved this explicitly: **client uploads directly to Supabase Storage** and sends URLs. Backend was simplified accordingly — `POST /api/requests` never receives file bytes.
8. **Login-time OTP.** Original backend prompt flagged this as an open decision ("could optionally be required again at login"). Frontend already resolved it: **password-only login, no OTP.** Adopted as final.
9. **Missing endpoints entirely.** `GET/PUT /api/workers/me`, `GET /api/workers/me/earnings`, and `GET /api/payments/history` appear in the frontend's contract table but have no equivalent in the original backend prompt at all. Added in §7/§9.
10. **JSON casing.** Neither source document addressed this head-on: the DB schema is snake_case throughout, but the frontend's entire contract table is camelCase. Without an explicit serialization layer (§1), every single endpoint would mismatch on day one. Added as a first-class architectural decision, not an afterthought.
11. **Four endpoints missing from backend contract (reverse-audit).** A cross-check of the frontend's service layer against the backend §9 table surfaced four endpoints called in `job.service.ts` and `profile.service.ts` that had no backend entry: `GET /api/jobs/:id`, `GET /api/jobs/active`, `GET /api/users/me`, `PUT /api/users/me`. Added to §7 (Phase 5 checklist) and §9 above. The `users` blueprint must be added to the folder structure alongside the existing `workers` blueprint.

---

## 12. Open Questions / Decision Log

| # | Question | Status | Notes / Proposed Default |
|---|---|---|---|
| 1 | How is the platform's 5% fee collected on **cash**-paid jobs, since no Paymob charge ever happens? | 🟡 **Needs product sign-off** | Proposed default for this demo: cash jobs do **not** generate a worker payout-balance credit (worker already holds the cash) and the platform simply does not collect its fee on cash transactions — a documented limitation, not a silent gap. Alternatives to consider before production: require workers to pre-fund a small fee-balance, or disable cash for jobs above a price threshold |
| 2 | Should `country_prefix` remain a first-class column, or purely a derived/display value from `phone_number`? | ✅ Resolved (this plan) | Derived server-side from the E.164 number via `phonenumbers`; not accepted as separate client input |
| 3 | Does the backend need to keep its own `geo_data.py` in sync with the frontend's `geo-data.ts` by hand, or should one side generate the other? | 🟡 Open | For now: manually mirrored, flagged as a future automation target (e.g. a shared JSON file both repos import) |
| 4 | Paymob return/callback URL — does it land on a frontend route or a backend route before redirecting into the app? | 🟡 Open | Assumed: a frontend route (e.g. `/payment/callback`) handles the visual redirect; actual state confirmation still comes from the **webhook**, not the redirect itself, so this is UX-only and doesn't block backend work |
| 5 | Socket auth — JWT passed via Socket.IO `auth` payload on connect vs. a query string param? | ✅ Resolved | **`auth` payload** — confirmed by `WebSocketService` in Phase 1: `io(wsUrl, { auth: { token: jwt } })`. Backend connect handler reads `request.environ['HTTP_AUTHORIZATION']` or the Socket.IO `auth` dict accordingly |
| 6 | Server-side enforcement of the frontend's "max 5 images / 20MB per file" rule — hard reject, or just cap what's stored? | ✅ Resolved (this plan) | Hard reject requests with more than 5 image URLs; file-size itself is a Supabase Storage bucket policy concern (client-side upload), not something this backend can inspect after the fact |
| 7 | Rate at which OTP re-sends are throttled | ✅ Resolved (this plan) | Exponential backoff per phone number instead of a flat window: 30s → 60s → 120s → ... doubling on each send, capped at 24h; resets on successful verification |

---

*Plan drafted 2026-09-10 — backend implementation not yet started. This document, §9 and §10 specifically, is the contract the frontend team should build Phases 3–6 against going forward.*
