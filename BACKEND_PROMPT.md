# Backend Build Prompt (for Claude Code) — Handy

Use this as the initial prompt to Claude Code when building the backend.

---

You are building the **backend** of "Handy", a two-sided marketplace web app connecting normal users who need repair/installation work with handymen (Plumber, Electrician, Carpenter, IT) who do that work — think Uber's rider/driver matching, applied to home-repair jobs.

## Stack
- **Python + Flask** (use Flask blueprints to organize routes by domain: auth, requests, offers, payments, ratings, ai).
- **Database: PostgreSQL via Supabase** — use Supabase's Python client and/or SQLAlchemy (your call; document the choice), and write the schema as SQL migrations.
- **Auth:** JWT-based (e.g. `flask-jwt-extended`), password hashing with `bcrypt`/`argon2`.
- **Realtime:** **WebSockets** (`flask-socketio` or a similar library) — **not polling** — to push: new matching requests to handymen, new offers to users, "you've been chosen" notifications, and job status changes (`job.started`, `job.finished`, `job.canceled` — with enough payload to distinguish a user-initiated cancel from a worker-initiated one). Document the full socket event names/payloads (e.g. `request.created`, `offer.created`, `offer.chosen`, `job.started`, `job.finished`, `job.canceled`).
- **AI Suggestion endpoint:** calls **Gemini Flash** (chosen specifically as the free-tier option) to turn a short description into a polished description + recommended worker type.
- **Payments:** **Paymob** (sandbox) as the single payment gateway. Paymob itself handles the underlying payment method (cards, mobile wallets including Vodafone Cash) — the backend only needs to integrate with Paymob's API/webhooks, not with Vodafone Cash directly.
- **Phone OTP verification:** **AuthEvo** (https://authevo.dev) — a WhatsApp-based OTP API with an automatic Telegram fallback and an optional TOTP 2FA layer. Full reference: https://authevo.dev/en/docs/api. Wrap it behind a small internal `otp_provider` module so it's easy to stub for local dev/tests without live credentials.

  **AuthEvo API contract (already documented, use as-is):**
  - Base URL: `https://api.authevo.dev`
  - Auth: `Authorization: Bearer <AUTHEVO_API_KEY>` header on every call (store the key in env config, never commit it).
  - All phone numbers must be in **E.164 format** (e.g. `+201234567890`) — validate/normalize on the way in.
  - `POST /v1/otp/send` — body `{ "phone": "<E.164>" }`. Sends a code over WhatsApp. Success (`200`): `{ "data": { "message_id", "status": "sent", "expires_in" } }`. If WhatsApp can't reach the number and Telegram isn't linked yet, returns `409` with `{ "error": { "code": "CHANNEL_NOT_LINKED", "message", "telegram_bot_url" } }` — surface `telegram_bot_url` to the frontend so it can show the user a one-tap Telegram link instead of failing the registration.
  - `POST /v1/otp/verify` — body `{ "phone", "code" }`. Returns `{ "data": { "verified": true|false } }`.
  - `POST /v1/otp/telegram-link` — body `{ "phone" }`. Returns `{ "data": { "telegram_bot_url", "expires_in" } }`. Call this proactively right after a phone number is first OTP-verified, so the Telegram fallback is pre-linked before it's ever needed again (don't wait for a future WhatsApp failure). Safe to call repeatedly — just issues a fresh link.
  - AuthEvo has a documented **sandbox mode** (https://authevo.dev/en/docs/sandbox) — use it for local/dev/test environments before switching to a live key.
  - AuthEvo also supports webhooks (https://authevo.dev/en/docs/webhooks) with signature verification, and a TOTP enroll/verify/disable trio for optional 2FA — not required for this app's core flow, but the `otp_provider` module can expose hooks for these later if we add 2FA.

## Data Model (design as normalized Postgres tables)
- `work_type` — a **Postgres enum type** (`plumber`, `electrician`, `carpenter`, `it`), not a free-text lookup table. Mirror this exactly as a Python `enum.Enum` in the codebase so both layers stay in sync; adding a new type means updating the enum in both places (and a migration for the Postgres enum).
- `users` — id, username, phone_number, country_prefix, country, governorate, password_hash, role (`user` | `worker`), phone_verified (bool), created_at.
- `worker_profiles` — id, user_id (FK), work_type (`work_type` enum), bio (short description text), has_shop (bool), shop_location (nullable text), average_rating, ratings_count, completed_jobs_count.
- `requests` — id, user_id, description, work_type (`work_type` enum), status (`open`, `offer_selected`, `in_progress`, `completed`, `cancelled`), created_at.
- `request_images` — id, request_id, image_url.
- `offers` — id, request_id, worker_id, price, status (`pending`, `chosen`, `rejected`, `withdrawn`), created_at.
- `jobs` — id, request_id, worker_id, user_id, agreed_price, platform_fee, total_charged, status (`pending`, `started`, `finished`, `canceled`), started_at, finished_at, canceled_at, canceled_by (`user` | `worker`, nullable).
- `ratings` — id, job_id, worker_id, user_id, stars (1–5), comment (nullable), created_at. Unique constraint on `job_id` so a job can only be rated once.
- `payments` — id, job_id, user_id, amount, paymob_order_id, paymob_transaction_id, status (`pending`, `paid`, `failed`, `refunded`), created_at.
- `payouts` — id, worker_id, job_id, amount, paymob_reference, status, created_at.
- `otp_verifications` — id, phone_number (E.164), purpose (`registration`, `login`), authevo_message_id, verified (bool), created_at, expires_at.
- `telegram_links` — id, phone_number (E.164), linked_at, last_link_issued_at (tracks that a Telegram-link call has been made for this number so we don't need to re-issue on every OTP send).

## Endpoints to Build

### Auth
- `POST /api/auth/send-otp` — body: `phone_number` (normalize to E.164), `purpose`. Calls AuthEvo's `/v1/otp/send`, stores an `otp_verifications` row with the returned `message_id`. If AuthEvo returns `409 CHANNEL_NOT_LINKED`, pass the `telegram_bot_url` straight through in this endpoint's response so the frontend can show it (don't treat this as a hard failure).
- `POST /api/auth/verify-otp` — body: `phone_number`, `code`, `purpose`. Calls AuthEvo's `/v1/otp/verify`, marks the record `verified` when `data.verified` is `true`; registration should check this before creating the user (or create the user in a "pending" state until verified — your call, document it). On the first successful verification for a phone number, fire-and-forget a call to AuthEvo's `/v1/otp/telegram-link` and upsert a `telegram_links` row, so the Telegram fallback is pre-linked for that number going forward.
- `POST /api/auth/register` — validates role-conditional fields (work_type, bio, has_shop/shop_location required only if role=worker); requires a verified OTP for the given phone number; hashes password.
- `POST /api/auth/login` — accepts `identifier_type` (`username`|`phone`), `identifier`, `password`; returns JWT + role.

### Requests (Normal User)
- `POST /api/requests` — create a request (description, work_type enum value, optional images uploaded to Supabase Storage). Validate description is non-empty. Emits a `request.created` WebSocket event to matching workers.
- `POST /api/ai-suggest` — takes a short description, calls Gemini Flash, returns `{ suggested_description, recommended_work_type }` (the latter must be one of the `work_type` enum values).
- `GET /api/requests/:id/offers` — list current offers for a request (in addition to the live WebSocket feed, for initial page load/reconnect).
- `POST /api/requests/:id/choose` — body: `worker_id`. Marks that offer as chosen, all other offers as rejected, request status → `offer_selected`, creates a `jobs` row, emits `offer.chosen` to the chosen worker over WebSocket, hides request from other workers (emit a `request.closed` event to them too).
- `POST /api/requests/:id/cancel` — cancels a request (only if still open) or lets the user unselect a chosen offer to pick another (only before payment/job start — define the exact allowed transitions).

### Offers (Worker)
- `GET /api/workers/me/requests` — list of open requests matching the worker's work_type.
- `POST /api/requests/:id/accept` — creates a `pending` state for pricing.
- `POST /api/requests/:id/offer` — body: `price`. Creates the offer row; computed `price * 1.05` is what's shown to the user (do this computation server-side, never trust a client-sent total). Emits `offer.created` to the requesting user over WebSocket.
- `POST /api/requests/:id/decline` — removes this worker from consideration for that request.

### Jobs & Lifecycle (state machine, driven mainly by the user)
A job is created in status **`pending`** the moment `POST /api/requests/:id/choose` succeeds. From there:

- `POST /api/jobs/:id/start` — **user only**. Allowed only from `pending`. Sets status → `started`, `started_at` = now. Emits `job.started` over WebSocket to the worker. No money moves.
- `POST /api/jobs/:id/finish` — **user only**. Allowed only from `started`. This is the **single point where payment is charged**:
  1. Recompute `total_charged = agreed_price * 1.05` server-side from the stored offer price (never trust a client-sent amount).
  2. Initiate/confirm the **Paymob** charge for that amount (see Payment below).
  3. Only on confirmed payment success, set job status → `finished`, `finished_at` = now, credit the worker's payable balance with `agreed_price` (5% fee is additive, not deducted from the worker).
  4. Emit `job.finished` over WebSocket to both the user and the worker — the frontend uses this to trigger the rating prompt on the user's side.
  - If the Paymob charge fails, the job stays in `started` and the endpoint returns an error the frontend can show, letting the user retry.
- `POST /api/jobs/:id/cancel` — **user only**. Allowed from `pending` or `started`. Sets status → `canceled`, `canceled_at` = now, `canceled_by = 'user'`. No payment involved (nothing was ever charged). Emits `job.canceled` to the worker.
- `POST /api/jobs/:id/worker-cancel` — **worker only**. Allowed from `pending` or `started` (i.e. any time before `finished`). Sets status → `canceled`, `canceled_at` = now, `canceled_by = 'worker'`. Emits `job.canceled` to the **user** over WebSocket with enough context for the frontend to show "the handyman canceled this job" messaging distinct from a user-initiated cancel. No payment/refund logic needed here either, since nothing was charged before `finished`.

**Important invariant:** no `payments` row, and no Paymob charge attempt, is ever created before `POST /api/jobs/:id/finish` is called. Enforce this in code, not just by convention — e.g. don't expose any other endpoint capable of charging the user.

### Payment
- `POST /api/webhooks/paymob` — webhook endpoint to receive and verify Paymob payment confirmations (validate the HMAC signature per Paymob's docs) and finalize the `payments`/`jobs` status update from the `finish` flow above, in case the integration is async (redirect/iframe callback) rather than a synchronous charge call.
- `POST /api/jobs/:id/payout` — worker requests payout of their earned balance (accumulated only from `finished` jobs) through **Paymob**'s payout/disbursement flow (sandbox for now).

### Ratings
- `POST /api/jobs/:id/rate` — body: `stars` (1–5, required), `comment` (optional). Only allowed once per job, only by the job's user, only after job status = `finished`. Updates the worker's cached `average_rating` / `ratings_count` on `worker_profiles` (recompute or increment — your call, document it).
- `GET /api/workers/:id/ratings` — paginated list of a worker's ratings/comments, plus the summary (average, count).

### Workers/Profile
- `GET /api/workers/:id` — public profile: name, work_type, bio, has_shop/shop_location, average_rating, ratings_count, completed_jobs_count.

## Cross-cutting requirements
- **Never trust client-submitted prices/amounts** for payment — always recompute the 5% fee and validate against the stored offer price server-side before touching money.
- **Never charge or attempt to charge the user before `POST /api/jobs/:id/finish` is called.** Pending and Started states must be fully payment-free; this is a hard invariant, not just a UX default.
- Enforce **role-based access** on every route (user-only vs worker-only vs either) — note that job **state transitions** are split by role: `start`/`finish`/`cancel` are user-only, `worker-cancel` is worker-only.
- Enforce the **request/offer/job state machine** strictly (e.g. can't accept an already-closed request, can't start a job that isn't `pending`, can't finish a job that isn't `started`, can't rate a non-`finished` job, can't cancel a `finished` job, can't pay twice).
- Enforce that phone numbers are **AuthEvo-verified** before a registration completes.
- Model `work_type` as an **enum** end-to-end (Postgres enum + Python enum), never as a free string field — this must match the frontend's TypeScript enum values exactly.
- Log every payment/payout action to `payments`/`payouts` for auditability.
- Provide a seed script / fixtures for local dev (sample users, workers, a full request→offer→job→rating cycle) so the frontend team can develop against realistic data.
- Write this as an OpenAPI spec (or at least a clear `api-contract.md`) alongside the code, including the WebSocket event schema, so the Angular frontend can be built against a stable contract.

## Notes
- Ask me for **Paymob** sandbox credentials/docs, the **Gemini Flash** API key, and an **AuthEvo** API key (`AUTHEVO_API_KEY`) before wiring those integrations for real; AuthEvo's contract is already specified above, but stub each provider behind an interface so the rest of the system can be built and tested without live keys, and use AuthEvo's own sandbox mode where possible during development.
- Flag any part of the state machine (e.g., can a user "unchoose" a worker after payment?) where you need a product decision before proceeding, rather than guessing silently.
