# Frontend ↔ Backend Merge Plan

Generated from a full audit comparing the actual frontend source (`frontend/src/app/`) against
the real backend contract built in Phases 1–6 (`backend/api-contract.md`). `FRONTEND_PLAN.md`'s
"API Contract Notes" section was not trusted at face value — this list reflects what the code
actually does, verified by reading both sides.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` fixed & verified

All items below are fixed and verified: backend test suite (48/48) passes, and `ng build`
(both dev and prod configurations) passes with zero errors.

---

## Blocking

- [x] **1. Double `/api/api/` URL prefix on nearly every service.** Stripped the redundant
      `/api` prefix from `request.service.ts`, `job.service.ts`, `payment.service.ts`, and
      `profile.service.ts` (`auth.service.ts` was already correct).

- [x] **2. `GET /api/requests/:id` didn't exist on the backend.** Added it —
      `request_service.get_request_for_viewer()` + a new route in
      `backend/app/blueprints/requests/routes.py`, accessible by the request's own user or
      any worker. Covered by a new backend test (`test_get_request_accessible_by_owner_and_any_worker`).

- [x] **3 & 4. Request images: `imageUrls` vs `images` field-name mismatch.** Renamed
      `JobRequest.imageUrls` → `images` in `models.ts` to match backend's `serialize_request()`;
      fixed `make-request.component.ts`'s submit payload; fixed every template reading
      `imageUrls` (`live-offers`, `requests-feed`, `request-detail`). Confirmed
      `image-upload.component.ts` already uploads to Supabase Storage and resolves to public
      URLs before this field is ever touched.

- [x] **5. `Offer` model had flat `workerName`/`workerRating`/etc.** Replaced with a nested
      `OfferWorker` type matching backend's `offer.worker` shape exactly; also fixed
      `Offer.userPrice` → `priceWithFee` (backend's actual field name) and added the missing
      `status` field. Updated `live-offers.component.ts`/`.html` accordingly.

- [x] **6. `cancelJob()` typed as unwrapped `Job`.** Now typed `Observable<{ job: Job }>`
      matching the backend; fixed both consumers (`worker-active-job.component.ts`,
      `active-job.component.ts`) to read `res.job`.

- [x] **7. `getTransactionHistory()` typed as a bare array.** Now returns
      `PaymentHistoryResponse { transactions, page, total }` matching the backend; fixed
      `transaction-history.component.ts` to read `res.transactions`.

- [x] **8. `updateWorkerProfile()`/`updateUserProfile()` typed as unwrapped.** Now return
      `{ worker: Worker }` / `{ user: User }` matching the backend; fixed
      `profile.component.ts` / `user-profile.component.ts` to read `.worker`/`.user`.

## Minor

- [x] **9. `TokenPayload.username` assumed present in the JWT.** Left as a soft fallback
      (backend genuinely never puts a username claim in the token) — `user-home`/`worker-home`
      already degrade gracefully via `?? placeholder`, so no crash risk; not worth plumbing an
      extra profile fetch through purely for a greeting string.

- [x] **10. `rateJob()` return type wrong.** Now typed `Observable<{ rating: Rating }>`
      matching the backend's `{ rating }` wrapper.

- [x] **11. `totalSpent`/`totalEarned` filtered on `status === 'confirmed'`.** Fixed to
      `'paid'` in both `transaction-history.component.ts` and `earnings.component.ts`; also
      renamed the `PAYMENT.STATUS_CONFIRMED` translation key to `STATUS_PAID` in both
      `en.json`/`ar.json` to match.

- [x] **12. `WorkerRatingsResponse` missing `page` field.** Added.

## Additional issues found while fixing the above (frontend never had a clean `ng build`)

- [x] **13. `new_offer` WebSocket payload not unwrapped.** Fixed `live-offers.component.ts`
      to subscribe as `{ offer: Offer }` and destructure, matching backend's `emit_new_offer`.

- [x] **14. Worker's active-job screen listened for the wrong cancel event.** Backend
      delivers `job_canceled_by_worker` to the **user's** room and `job_canceled_by_user` to
      the **worker's** room. Fixed `worker-active-job.component.ts` to subscribe to
      `job_canceled_by_user` and actually handle it (update status, notify), instead of
      subscribing to an event that never reaches it.

- [x] **15. `Transaction`/earnings template field mismatches.** Fixed `transaction-history`
      to use `tx.method` (not the nonexistent `tx.paymentType`) and `status === 'paid'` (not
      `'confirmed'`). Discovered along the way that `GET /api/workers/me/earnings`'s
      transactions are a distinct, narrower shape (`{ jobId, amount, finishedAt }`, no
      `id`/`status`/`method`) — added a dedicated `EarningsEntry` model instead of
      overloading `Transaction`, and simplified the earnings template accordingly (every
      entry there is definitionally already a paid, finished online job — no status badge
      variants needed).

- [x] **16. `PaymentService` had no `withdraw()` method.** Rewired
      `earnings.component.ts` to call the actual `requestPayout(jobId)` contract, anchored on
      the most recent earnings entry's `jobId` (the backend endpoint only uses the job ID to
      verify worker ownership — the payout itself covers the whole balance, not just that job).

- [x] **17. `Worker` model field names didn't match `profile.component.html`.** Fixed the
      template to use `ratingsCount`/`completedJobsCount` instead of the nonexistent
      `totalRatings`/`completedJobs`.

- [x] **18. `request-detail.component.ts` compared `request.status === 'closed'`**, a value
      that never occurs. Fixed to `status !== 'open'`, matching the real `RequestStatus` enum
      (`open`/`offer_selected`/`cancelled`).

- [x] **19. User's "Cancel Job" button called the wrong (worker-only) endpoint.**
      `active-job.component.ts` called `jobService.cancelJob()` → `POST /api/jobs/:id/cancel`,
      which is `@worker_required` on the backend — every user cancel attempt would have
      403'd. Fixed to go through `PATCH /api/jobs/:id/status` with `{ status: 'canceled' }`,
      the actual user-only cancel path.

- [x] **20. OTP Telegram-fallback field name mismatch.** `otp-verification.component.ts`
      read `res.telegramLink`, but the backend's `POST /api/otp/send` response field is
      `telegramBotUrl`. The Telegram fallback link would never have rendered. Fixed the
      field name throughout the component and template; also added a distinct
      `AUTH.ERRORS.OTP_RATE_LIMITED` message for the backend's `429` rate-limit response
      (previously indistinguishable from a generic send failure).

- [x] **21. Corrupted markup in `live-offers.component.html`'s "Chosen Banner" block.**
      Found a stray `<div class="offer-card__stat-lbl">…AVG_RATING…</div>` and a line
      literally beginning with `+` sitting inside the post-choose confirmation banner — not
      something introduced by this session's edits. Flagged to the user before touching it;
      removed on their confirmation.

## Backend changes made along the way

- Added `GET /api/requests/:id` (see #2).
- Unified the two different `Job` response shapes the backend used to return: the slim dict
  from `PATCH /api/jobs/:id/status` and `POST /api/jobs/:id/cancel` (which had
  `startedAt`/`finishedAt`/`canceledAt` but not `workerName`/`workType`/`description`/
  `price`/`userPrice`) is now the same `serialize_job_full()` used by `GET /api/jobs/:id` and
  `GET /api/jobs/active` (which had the reverse gap). One `Job` shape everywhere now.
- `backend/api-contract.md` and `BACKEND_PLAN.md` §9 updated to reflect both of the above.

---

*All 21 items fixed and verified. This file is kept as a record of the merge audit rather
than deleted, since it documents real bugs (not just documentation drift) that are worth
being able to point back to.*
