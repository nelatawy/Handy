# Handy Backend — API Contract

This is the literal, implementation-verified contract for the Handy backend. It mirrors
`BACKEND_PLAN.md` §9–10 (the source of truth during design) but reflects what's actually
built and tested as of Phase 6. Where the two ever disagree, this file wins for the exact
request/response shapes; `BACKEND_PLAN.md` still holds the narrative reasoning for *why*
each decision was made.

- All request/response bodies are **JSON, camelCase**. The DB/ORM layer is snake_case
  internally; conversion happens at the schema/serialization boundary.
- Auth: `Authorization: Bearer <JWT>` header. JWT claims: `{ sub: userId, role: 'user'|'worker', work_type?: WorkType }`.
- Errors: `{ "error": { "code": string, "message": string|object, "retryAfter"?: number } }` with an appropriate HTTP status.
- `WorkType` enum: `plumber | electrician | carpenter | it`.

---

## Auth & OTP

### `POST /api/otp/send`
Body: `{ phone }` (E.164, e.g. `+201234567890`)
Response `200`: `{ channel: 'whatsapp'|'telegram', telegramBotUrl?: string, expiresIn?: number }`
Response `429` (rate limited): `{ error: { code: 'rate_limited', message, retryAfter } }` + `Retry-After` header.
Rate limit: exponential backoff per phone number — 30s, 60s, 120s, ... doubling, capped at 86400s (1 day). Resets on successful verification.

### `POST /api/otp/verify`
Body: `{ phone, code }`
Response `200`: `{ verified: boolean }`
On first successful verification for a phone, a Telegram pre-link is fired in the background (best-effort, does not affect the response).

### `POST /api/auth/register`
Body: `{ username, phone, country, governorate, password, role: 'user'|'worker', workType?, bio?, hasShop?, shopLocation? }`
- `workType`, `bio` required if `role='worker'`; `shopLocation` required if `hasShop=true`.
- Requires a verified OTP row for `phone` (unexpired, matched by phone number).
Response `201`: `{ token, role }` (auto-login).
Errors: `400 phone_not_verified`, `400 invalid_country`/`invalid_governorate`, `409 username_taken`/`phone_taken`, `400 validation_error`.

### `POST /api/auth/login`
Body: `{ identifierType: 'username'|'phone', identifier, password }`
Response `200`: `{ token, role }`
Errors: `401 invalid_credentials`.

---

## Requests & Offers (realtime)

### `POST /api/requests` — user only
Body: `{ description, workType, images?: string[] }` (images already uploaded to Supabase Storage client-side; max 5)
Response `201`: `{ requestId }`
Emits `new_request` to `worktype:{workType}` room.

### `GET /api/requests/mine` — user only
Response `200`: `Request[]`

### `GET /api/requests/:id/offers` — user only
Response `200`: `Offer[]` (excludes declined/`rejected` offers already filtered out for reconnect noise... actually returns all non-rejected offers: `pending` and `chosen`)

### `GET /api/workers/me/requests` — worker only
Response `200`: `Request[]` — open requests matching the worker's `work_type`, excluding any request this worker has already offered on or declined.

### `POST /api/requests/:id/offer` — worker only
Body: `{ price }`
Response `201`: `{ offerId, priceWithFee }` (`priceWithFee = price * 1.05`, computed server-side)
Errors: `400 request_closed`, `400 already_responded` (worker already offered or declined).
Emits `new_offer` to `user:{request.userId}`.

### `POST /api/requests/:id/decline` — worker only
Response `200`: `{ success: true }`
Implemented as a `rejected`-status offer row with `price=0` — reuses the `(requestId, workerId)` uniqueness to block double-response and to exclude the request from the worker's own feed going forward.

### `POST /api/requests/:id/choose` — user only
Body: `{ offerId }`
Response `200`: `{ jobId }`
Creates a `jobs` row in `pending`. Marks the chosen offer `chosen`, sibling `pending` offers `rejected`, request → `offer_selected`.
Emits `offer_chosen` to the winning worker, `offer_rejected` to losing workers, `request_closed` to the `worktype` room.
Errors: `400 request_closed`, `404` (offer not found), `400 offer_unavailable`.

### `POST /api/requests/:id/cancel` — user only
Response `200`: `{ request }`
Only allowed while `status='open'`. Errors: `400 invalid_state`.

### `POST /api/ai-suggest` — any authenticated role
Body: `{ description }`
Response `200`: `{ suggestedDescription, recommendedWorkType }` (`recommendedWorkType` always a valid `WorkType`, clamped server-side).

---

## Jobs (state machine)

### `PATCH /api/jobs/:id/status` — user only
Body: `{ status: 'started'|'finished'|'canceled', paymentType?: 'online'|'cash' }` (`paymentType` required iff `status='finished'`)
Response `200`: `{ job: Job, paymentUrl?: string }` (`paymentUrl` present only for `finished`+`online`, while the job is still `started` pending webhook confirmation)
- `pending → started`: sets `startedAt`. Emits `job_status_changed`.
- `started → finished` (`cash`): synchronously creates a `paid` payment, job → `finished` immediately, worker's `completedJobsCount` incremented. Emits `job_status_changed`.
- `started → finished` (`online`): creates a `pending` payment + Paymob checkout, job **stays `started`** until the webhook confirms.
- `pending`/`started` → `canceled`: `canceledBy='user'`. Emits `job_status_changed` + `job_canceled_by_user` (to the worker).
Errors: `403 forbidden` (not your job), `400 invalid_state`, `400 validation_error` (missing `paymentType` on finish).

### `POST /api/jobs/:id/cancel` — worker only
Response `200`: `{ job: Job }`
Allowed from `pending`/`started`. `canceledBy='worker'`. Emits `job_status_changed` + `job_canceled_by_worker` (to the user).

### `GET /api/jobs/:id` — job's user or worker only
Response `200`: full `Job` object — `{ id, requestId, offerId, userId, workerId, workerName, workType, description, price, userPrice, status, paymentType, canceledBy, createdAt, updatedAt }`
Errors: `403 forbidden` for anyone else.

### `GET /api/jobs/active` — any authenticated role
Response `200`: same full `Job` shape as above, or `null`. Role-aware: `user_id=caller` for users, `worker_id=caller` for workers; most recent `pending`/`started` job.

### `POST /api/jobs/:id/rate` — user only
Body: `{ stars: 1-5, comment?: string }`
Response `201`: `{ rating }`
Only once per job (`ratings.job_id` unique), only after `status='finished'`, only by the job's own user. Recomputes `worker_profiles.average_rating`/`ratings_count` incrementally.
Errors: `400 invalid_state`, `409 already_rated`, `403 forbidden`.

### `POST /api/jobs/:id/payout` — worker only
Response `201`: `{ payout }`
Requests payout of the worker's entire current balance (see `GET /api/workers/me/earnings`) via `paymob.create_payout(...)`. `job_id` in the path just verifies the caller owns that job; the payout itself isn't scoped to a single job.
Errors: `403 forbidden`, `400 no_balance`.

---

## Payments

### `POST /api/webhooks/paymob`
Body: Paymob payload, expected here as `{ orderId, success: boolean, transactionId? }` (mock shape; live shape TBD once real Paymob credentials are wired). HMAC verified via query param `?hmac=...`.
Response `200`: `{ success: true }` (idempotent — always 200 once dispatched, business failure is reflected in job/payment state, not the HTTP status)
On success: `payments.status='paid'`, `jobs.status='finished'`, worker's `completedJobsCount` incremented. Emits `payment_confirmed` then `job_status_changed`.
On failure: `payments.status='failed'`, job stays `started`. Emits `payment_failed` to the user.
Errors: `400 invalid_signature`, `404` (no matching pending payment for that `orderId` — also the response to a replayed webhook, since the payment is no longer `pending`).

### `GET /api/payments/history` — user only
Query: `page` (default 1)
Response `200`: `{ transactions: [{ id, jobId, amount, method, status, createdAt }], page, total }`

### `GET /api/workers/me/earnings` — worker only
Response `200`: `{ balance, transactions: [{ jobId, amount, finishedAt }] }`
`balance` = sum of `agreed_price` on `finished` jobs with `paymentType='online'`, minus prior payouts. **Cash jobs are excluded** (worker already holds the cash) — see `BACKEND_PLAN.md` §12.1 for the known platform-fee gap this leaves on cash transactions.

---

## Ratings & Profiles

### `GET /api/workers/:id/ratings` — public
Query: `page` (default 1)
Response `200`: `{ ratings: [{ id, jobId, stars, comment, createdAt }], average, count, page }`

### `GET /api/workers/me` — worker only
Response `200`: `Worker` (self)

### `PUT /api/workers/me` — worker only
Body: `{ bio?, hasShop?, shopLocation? }`
Response `200`: `{ worker: Worker }`

### `GET /api/workers/:id` — public
Response `200`: `Worker` — `{ id, username, workType, bio, hasShop, shopLocation, averageRating, ratingsCount, completedJobsCount }`

### `GET /api/users/me` — user only
Response `200`: `{ id, username, phone, country, governorate, role, createdAt }`

### `PUT /api/users/me` — user only
Body: `{ username?, country?, governorate? }` (phone changes excluded — require OTP re-verification, not implemented)
Response `200`: `{ user }`
Errors: `409 username_taken`, `400 invalid_country`/`invalid_governorate`.

---

## WebSocket Events

Connect: client passes `{ auth: { token: jwt } }` on `io(wsUrl, { auth: { token } })`. Unauthenticated or invalid-token connections are rejected with `ConnectionRefusedError` (client sees a `connect_error` event, not a silent open). On success, the socket joins `user:{id}` (always) and `worktype:{workType}` (workers only).

| Event | Direction | Payload | Fired by |
|---|---|---|---|
| `new_request` | Server → matching Workers (`worktype:{type}`) | `{ request }` | `POST /api/requests` |
| `request_closed` | Server → `worktype:{type}` room | `{ requestId }` | `choose` / user `cancel` |
| `new_offer` | Server → requesting User | `{ offer }` | `POST /api/requests/:id/offer` |
| `offer_chosen` | Server → chosen Worker | `{ jobId }` | `choose` |
| `offer_rejected` | Server → losing Workers | `{ requestId }` | `choose` |
| `job_status_changed` | Server → User + Worker | `{ jobId, status }` | `started`, `finished` (both payment paths), user `canceled` |
| `job_canceled_by_user` | Server → Worker | `{ jobId }` | user-initiated cancel |
| `job_canceled_by_worker` | Server → User | `{ jobId }` | worker-initiated cancel |
| `payment_confirmed` | Server → User + Worker | `{ jobId, amount }` | Paymob webhook success |
| `payment_failed` | Server → User | `{ jobId }` | Paymob webhook failure (not in the original design table — added in Phase 4 since the plan calls for an error-capable retry signal) |

---

## Known limitations (carried over from `BACKEND_PLAN.md` §12, not silent gaps)

1. Platform fee is not collected on cash-paid jobs (no Paymob charge ever happens for `paymentType='cash'`).
2. `country`/`governorate` validation uses a hand-mirrored `app/data/geo_data.py` — must be kept in sync with the frontend's `geo-data.ts` manually.
3. Paymob return/callback URL handling is assumed to be a frontend-only concern; actual state confirmation always comes from the webhook.
4. Live AuthEvo/Paymob/Gemini integrations are unimplemented (`NotImplementedError`) — only `mock` mode is exercised by the test suite and this contract. Wiring live credentials requires implementing the `NotImplementedError` branches in `app/providers/*.py`.
