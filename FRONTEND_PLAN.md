# Handy — Frontend Development Plan

> **Stack:** Angular 21 · SCSS (no Tailwind) · Socket.IO (`flask-socketio` backend) · i18n (AR + EN / RTL) · Paymob sandbox (redirect checkout)
> **Theme:** Sky-blue & white primary palette · semantic green/red accents
> **This file is the single source of truth for frontend progress. Update the checklist below as work is completed.**

---

## Table of Contents

1. [Architecture & Key Decisions](#1-architecture--key-decisions)
2. [Project Scaffolding](#2-project-scaffolding)
3. [Phase 1 — Foundation](#3-phase-1--foundation)
4. [Phase 2 — Auth](#4-phase-2--auth)
5. [Phase 3 — Core Flow (User Side)](#5-phase-3--core-flow-user-side)
6. [Phase 4 — Core Flow (Handyman Side)](#6-phase-4--core-flow-handyman-side)
7. [Phase 5 — Payment & Profiles](#7-phase-5--payment--profiles)
8. [Phase 6 — Polish & QA](#8-phase-6--polish--qa)
9. [API Contract Notes](#9-api-contract-notes)
10. [Open Questions / Decision Log](#10-open-questions--decision-log)

---

## 1. Architecture & Key Decisions

| Concern | Decision |
|---|---|
| **Components** | Standalone components (Angular 21 default) — no NgModules |
| **State management** | Angular signals for local/component state; services with `BehaviorSubject` / signals for shared state (auth, notifications, active job). No NgRx — the app isn't complex enough to justify it |
| **Routing** | Angular Router with lazy-loaded route groups (auth, user, worker, shared) |
| **Forms** | Reactive Forms (`FormGroup`, `FormControl`) with custom validators |
| **i18n** | `@ngx-translate/core` + `@ngx-translate/http-loader` — translation JSON files per language (`en.json`, `ar.json`). Document direction toggled on `<html>` tag via a service |
| **Realtime** | `socket.io-client` (backend uses `flask-socketio`). A single `WebSocketService` wrapping the Socket.IO client, auto-reconnects, and exposes typed observables per event |
| **HTTP** | Angular `HttpClient` with a base-URL interceptor reading from `environment.ts` and a JWT-auth interceptor |
| **Styling** | Global SCSS variables/mixins for the design system (colors, spacing, typography, breakpoints). Component-scoped SCSS. A small set of utility classes for common patterns (flex, grid, spacing) |
| **Worker type enum** | `enum WorkType { Plumber = 'plumber', Electrician = 'electrician', Carpenter = 'carpenter', IT = 'it' }` — used everywhere, never raw strings |
| **Phone format** | Always stored/sent in **E.164** (e.g. `+201234567890`). A utility function formats the country code + local number |

### Folder Structure (planned)

```
src/
├── app/
│   ├── core/                      # Singleton services, interceptors, guards
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── websocket.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── job.service.ts
│   │   │   ├── request.service.ts
│   │   │   ├── payment.service.ts
│   │   │   └── language.service.ts
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts
│   │   │   └── api-url.interceptor.ts
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   ├── role.guard.ts          # user-only / worker-only
│   │   │   └── no-auth.guard.ts       # redirect if already logged in
│   │   └── models/
│   │       ├── user.model.ts
│   │       ├── request.model.ts
│   │       ├── job.model.ts
│   │       ├── offer.model.ts
│   │       └── enums.ts               # WorkType, JobStatus, etc.
│   ├── shared/                    # Reusable UI components, pipes, directives
│   │   ├── components/
│   │   │   ├── star-rating/
│   │   │   ├── job-status-badge/
│   │   │   ├── language-switcher/
│   │   │   ├── otp-verification/
│   │   │   ├── toast/
│   │   │   ├── country-prefix-dropdown/
│   │   │   └── image-upload/
│   │   ├── pipes/
│   │   │   └── translate-enum.pipe.ts
│   │   └── directives/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── register/
│   │   │   └── login/
│   │   ├── user/
│   │   │   ├── make-request/
│   │   │   ├── live-offers/
│   │   │   ├── active-job/
│   │   │   ├── transaction-history/
│   │   │   └── user-home/
│   │   └── worker/
│   │       ├── requests-feed/
│   │       ├── request-detail/
│   │       ├── pricing/
│   │       ├── active-job/
│   │       ├── profile/
│   │       ├── earnings/
│   │       └── worker-home/
│   ├── layouts/
│   │   ├── main-layout/              # header, nav, footer wrapper
│   │   └── auth-layout/              # minimal layout for login/register
│   └── app.routes.ts
├── assets/
│   ├── i18n/
│   │   ├── en.json
│   │   └── ar.json
│   └── images/
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
└── styles/
    ├── _variables.scss
    ├── _mixins.scss
    ├── _typography.scss
    ├── _reset.scss
    ├── _utilities.scss
    └── styles.scss                  # global entry point
```

---

## 2. Project Scaffolding

- [x] Create Angular 21 project (`ng new handy --style=scss --routing --standalone`) — Angular CLI 21.2.8
- [x] Install dependencies: `@ngx-translate/core` v18, `@ngx-translate/http-loader`, `rxjs`, `socket.io-client`, `@supabase/supabase-js`, `@angular/animations`
- [x] Set up `environment.ts` with `apiUrl` and `wsUrl` placeholders
- [x] Set up global SCSS design system (`_variables.scss`, `_mixins.scss`, `_typography.scss`, `_reset.scss`, `_utilities.scss`)
- [x] Import Inter (EN) and Cairo (AR) fonts via Google Fonts
- [x] Configure `@ngx-translate` with `provideTranslateHttpLoader` and create full `en.json` / `ar.json`

---

## 3. Phase 1 — Foundation ✅

### Design System & Layout
- [x] Define SCSS variables: primary sky-blue (`#0ea5e9` family), white, accent green/red, neutrals, shadows, border-radii, spacing scale
- [x] Build responsive mixins (mobile-first breakpoints: 480, 768, 1024, 1280)
- [x] Typography scale (headings, body, caption) with font-family fallback chains
- [x] Global reset + base styles
- [x] Utility classes (flex, grid, text-align, spacing, buttons, badges, skeleton)

### Core Services
- [x] `AuthService` — login, register, logout, JWT storage/decode, role signals, `isAuthenticated` computed
- [x] `WebSocketService` — Socket.IO client, auto-reconnect, typed event observables via Subject
- [x] `NotificationService` — signal-based toast queue, success/error/info/warning, auto-dismiss, action buttons
- [x] `LanguageService` — signal-based language toggle, RTL/LTR direction, persist in `localStorage`

### Interceptors
- [x] `AuthInterceptor` — attach JWT `Authorization: Bearer <token>` header to outgoing requests
- [x] `ApiUrlInterceptor` — prepend `environment.apiUrl` to relative paths

### Guards
- [x] `AuthGuard` — redirect to `/auth/login` if not authenticated
- [x] `RoleGuard` — redirect if role doesn't match route `data.expectedRole`
- [x] `NoAuthGuard` — redirect authenticated users away from login/register

### Models & Enums
- [x] `WorkType` enum (with EN + AR labels)
- [x] `JobStatus` enum (`Pending`, `Started`, `Finished`, `Canceled`)
- [x] `PaymentType` enum (`Online = 'online'`, `Cash = 'cash'`)
- [x] `User`, `Worker`, `JobRequest`, `Offer`, `Job`, `Rating`, `Transaction`, auth response interfaces
- [x] `geo-data.ts` — bundled country + governorate static data (Egypt 27 govs, Saudi, UAE, etc.)

### Shared Components
- [x] **Star Rating** — read-only + interactive mode, hover states, size variants, `ratingChange` event
- [x] **Job Status Badge / Stepper** — colored badge or horizontal stepper (Pending → Started → Finished)
- [x] **Language Switcher** — flag + label toggle button
- [x] **OTP Verification** — phone input → "Send OTP" → code input → "Verify" flow; Telegram fallback
- [x] **Toast / Notification** — animated slide-in toast with type icons, auto-dismiss, action button
- [x] **Country Prefix Dropdown** — searchable dropdown of country codes with flags, outputs selected code
- [x] **Image Upload** — multi-file picker with drag-and-drop, previews, remove button; Supabase upload

### Layouts
- [x] **Auth Layout** — gradient background, centered card, Handy branding, language switcher
- [x] **Main Layout** — sticky glassmorphism navbar, role-based nav links, mobile hamburger drawer

### Routing Skeleton
- [x] Define route tree with lazy loading: `/auth/**`, `/user/**`, `/worker/**`
- [x] Apply guards to route groups (authGuard + roleGuard on user/worker, noAuthGuard on auth)
- [x] Default redirect logic based on auth state + role
- [x] Build passes clean (zero errors) ✓

---

## 4. Phase 2 — Auth ✅

### Register Page
- [x] Role toggle (Normal User / Worker) at top — switches visible fields
- [x] Shared fields: username, phone (with country-prefix dropdown), country, governorate, password, confirm password
- [x] Worker-specific fields: work-type dropdown, bio textarea, "Has a shop?" toggle → shop location input
- [x] Client-side validation (required, password match, phone format, min lengths)
- [x] Integrate OTP verification component after phone entry — block submission until verified
- [x] Handle Telegram fallback display (show link/QR when backend returns `CHANNEL_NOT_LINKED`)
- [x] On success → **auto-login**: backend returns JWT on successful registration, store it and redirect to the appropriate home page based on role
- [x] All strings via `@ngx-translate`

### Login Page
- [x] Identifier type selector (Username / Phone Number)
- [x] Dynamic input (label + placeholder change based on selection)
- [x] Password field
- [x] Call backend `/api/auth/login`, store JWT, decode role, redirect to `/user/home` or `/worker/home`
- [x] Error handling (invalid credentials, account not found, etc.)
- [x] All strings via `@ngx-translate`

---

## 5. Phase 3 — Core Flow (User Side) ✅

> **Priority:** This is the critical path. Get request → offers → choose → start → finish → rate working end-to-end first.

### Make a Request
- [x] Form: image upload (optional, multi), description textarea (required), work-type dropdown
- [x] "AI Suggestion" button → `POST /api/ai-suggest` with current description → show editable preview (suggested description + recommended work type) → accept fills form, dismiss keeps original
- [x] "Confirm Request" → `POST /api/requests` → navigate to live offers screen
- [x] "Cancel" → navigate back / clear form

### Live Offers Screen
- [x] Request summary card at top
- [x] Responsive grid of offer cards, populated **live via WebSocket**
- [x] Each card: handyman name, quoted price, average rating (star-rating component, read-only), completed jobs count, shop badge (if applicable)
- [x] Card click → expand/reveal **Choose** (green) + **Cancel** (red) buttons
- [x] Only one card can be "selected" at a time (selecting another auto-deselects the previous)
- [x] Choose → `POST /api/requests/{id}/choose` → creates job (Pending), disable other cards, show confirmation state
- [x] Transition to Active Job Screen

### Active Job Screen (User)
- [x] Display job details: handyman info, price, status stepper
- [x] **Pending state:** "Mark as Started" button + "Cancel Job" (red) button
- [x] **Started state:** "Mark as Finished" button (with price warning: "This will charge you [price]") + "Cancel Job" button
- [x] **Finishing flow — payment type selection:** When the user taps "Mark as Finished", show a **payment method choice** before finalizing:
  - **"Pay Online"** (primary) — redirects to Paymob hosted checkout (sandbox). On successful Paymob callback/redirect, the job is marked Finished with `paymentType: 'online'` sent to the backend.
  - **"Paid in Cash"** — confirms that the user already paid the handyman in cash on-site. Marks the job Finished immediately with `paymentType: 'cash'` sent to the backend. No Paymob redirect.
  - Both buttons send `PATCH /api/jobs/{id}/status` with `{ status: 'finished', paymentType: 'online' | 'cash' }`.
- [x] **Finished state:** read-only summary with a **payment type indicator** badge ("Paid Online" / "Paid in Cash"), payment confirmed indicator, **rating modal** auto-pops (star-rating interactive + optional comment → `POST /api/jobs/{id}/rate`)
- [x] **Canceled state:** read-only, banner distinguishing user-cancel vs handyman-cancel (with handyman-cancel: "The handyman canceled — no charge was made" + "Make a new request" link)
- [x] All state transitions update live via WebSocket

---

## 6. Phase 4 — Core Flow (Handyman Side)

### Worker Home
- [x] Hero greeting with handyman's name
- [x] Active job widget (click → worker active job) with status badge, work type, short description
- [x] CTA button to browse requests feed
- [x] Quick actions grid: Requests, Active Job, Earnings, Profile
- [x] WebSocket: toast on `new_request`, update active job on `job_status_changed`

### Requests Feed
- [x] List/grid of open requests matching this handyman's work type
- [x] Live updates via WebSocket (new requests appear, closed requests disappear)
- [x] Each item clickable → navigates to request detail

### Request Detail
- [x] Description, images (gallery/lightbox), location info
- [x] **Accept** + **Decline** buttons
- [x] Accept → navigate to pricing screen

### Pricing Screen
- [x] Input for worker's price
- [x] Live computed preview: "User will pay: [price + 5%]"
- [x] Submit → `POST /api/requests/{id}/offer` → navigate to pending state (waiting for selection)
- [x] WebSocket notification when chosen → navigate to active job
- [x] WebSocket notification when request closed by another handyman being chosen → toast + return to feed

### Active Job Screen (Handyman)
- [x] Mirror of user's active job screen, but **read-only for state transitions** (user drives Pending → Started → Finished)
- [x] Handyman's own **Cancel Job** button (available before Finished) → `POST /api/jobs/{id}/cancel` → notifies user in real time
- [x] State updates received live via WebSocket
- [x] Finished state shows earnings info

---

## 7. Phase 5 — Payment & Profiles

### Payment (User)
- [x] No separate "pay now" page — payment method choice is part of the "Mark as Finished" flow on the active job screen
- [x] **Pay Online** path: redirect to Paymob hosted checkout page (sandbox). Handle return/callback URL to confirm payment and finalize the job
- [x] **Paid in Cash** path: no Paymob involvement — job is finalized immediately with `paymentType: 'cash'`
- [x] Transaction history screen: list of past payments with date, job summary, amount, status, and **payment type badge** (Online / Cash)

### Payment (Worker)
- [x] Earnings balance display (sum of finished jobs' quoted prices)
- [x] Payout flow via Paymob
- [x] Transaction/payout history screen

### Worker Profile
- [x] Display: name, work type, bio, shop info (if any), average rating (star component), rating count, completed jobs count
- [x] Editable fields (bio, shop toggle/location) — `PUT /api/workers/me`

### User Profile (minimal)
- [x] Display: name, phone, location
- [x] Edit basic info

---

## 8. Phase 6 — Polish & QA

### Audit Findings (2026-09-10) — Codebase-wide review before continuing polish

A full audit of every component/service/style file surfaced the following concrete issues. Each is tracked individually below and fixed in this phase.

#### Dead code cleanup
- [x] Remove unused `app.html` / `app.scss` (boilerplate leftovers — `app.ts` uses an inline template, these files are never referenced)
- [x] Fix/remove the broken `app.spec.ts` "should render title" test (asserted on stale boilerplate markup)
- [x] Remove unused `WorkTypeLabel` (English-only map) imports/properties from `worker-home`, `request-detail`, `requests-feed` components — their templates already correctly use `'WORK_TYPE.' + x | translate`

#### i18n correctness bugs
- [x] `login.component.html` — `serverError()` rendered without the `translate` pipe (raw translation key like `AUTH.ERRORS.INVALID_CREDENTIALS` was shown to users instead of the localized message)
- [x] `register.component.html` — same `serverError()` bug
- [x] `register.component.html` — work-type `<option>` labels used the hardcoded English `WorkTypeLabel` map instead of `'WORK_TYPE.' + wt | translate` (Arabic users saw English work types)
- [x] `profile.component.ts` (worker) — `workTypeLabel` computed used the hardcoded English `WorkTypeLabel` map instead of the translate pipe (worker's own work-type badge never localized to Arabic)

#### Global error handling
- [ ] Add a global HTTP error interceptor (`httpErrorInterceptor`) that maps common HTTP failures (0/network, 401, 403, 404, 5xx) to translated fallback `TOAST.*` messages via `NotificationService`, so components don't need ad-hoc fallback strings

#### RTL / logical CSS properties
Physical (`margin-left`, `text-align: left`, etc.) properties don't mirror in RTL. Replace with logical equivalents (`margin-inline-start`, `text-align: start`, etc.) in:
- [ ] `features/user/active-job/active-job.component.scss`
- [ ] `features/user/make-request/make-request.component.scss`
- [ ] `features/user/live-offers/live-offers.component.scss`
- [ ] `features/user/user-home/user-home.component.scss`
- [ ] `features/worker/worker-home/worker-home.component.scss`
- [ ] `features/worker/request-detail/request-detail.component.scss`

#### Hardcoded English strings → translation keys
Many components called `NotificationService` with hardcoded English literals, and several templates had hardcoded English copy (headings, descriptions, buttons) that never localizes to Arabic. `NotificationService` itself was refactored to resolve translation keys centrally (`success`/`error`/`info`/`warning` now take an i18n key + optional interpolation params, with a `showRaw` escape hatch for backend-provided messages). Component call sites updated to use keys (**code done** — the corresponding `en.json`/`ar.json` key additions are tracked separately below and are NOT yet done):
- [x] `features/auth/login/login.component.html` (server error display)
- [x] `features/auth/register/register.component.html` (work type options, "Worker Details" divider, verify-hint paragraph)
- [x] `features/user/make-request/make-request.component.ts` + `.html` (notify calls, sub-header copy, min-length validation message)
- [x] `features/user/live-offers/live-offers.component.ts` + `.html` (notify calls, banner/empty-state copy)
- [x] `features/user/active-job/active-job.component.ts` + `.html` (notify calls, finished/rate-cta copy)
- [x] `features/user/user-home/user-home.component.html` (hero/cta copy)
- [x] `features/user/transaction-history/transaction-history.component.ts` (notify calls)
- [x] `features/user/user-profile/user-profile.component.ts` (notify calls)
- [x] `features/worker/worker-home/worker-home.component.ts` + `.html` (notify calls, hero/cta copy)
- [x] `features/worker/requests-feed/requests-feed.component.ts` + `.html` (notify calls, sub-header, time-ago strings, CTA copy)
- [x] `features/worker/request-detail/request-detail.component.ts` + `.html` (notify calls, back button, closed banner, photos heading)
- [x] `features/worker/pricing/pricing.component.ts` + `.html` (notify calls, descriptive copy, preview labels)
- [x] `features/worker/active-job/worker-active-job.component.ts` + `.html` (notify calls, banner copy, job-card labels, modal copy)
- [x] `features/worker/earnings/earnings.component.ts` (notify calls)
- [x] `features/worker/profile/profile.component.ts` (notify calls)
- [x] `shared/components/otp-verification/otp-verification.component.ts` (error messages)
- [x] `shared/components/image-upload/image-upload.component.ts` (file-too-large notify call)
- [x] Add every new translation key referenced above to `en.json` **and** `ar.json` — added a new `HOME` section plus ~90 new keys across `AUTH`, `REQUEST`, `OFFERS`, `JOB`, `WORKER`, `TOAST`, and `COMMON` (incl. `COMMON.TIME_AGO.*` for the worker feed's relative-time labels). Verified programmatically: every translation key referenced anywhere in `.ts`/`.html` files now resolves in both `en.json` and `ar.json`, and the two files have 100% identical key sets (288 keys each). `ng build` passes clean.

### RTL / Localization
- [x] Complete `en.json` and `ar.json` with all strings (added `TOAST`/`COMMON`/feature-specific keys uncovered by the audit above)
- [ ] Test every page in RTL mode — fix layout mirroring issues
- [ ] Ensure dropdowns, modals, toasts work correctly in RTL

### Responsive Design
- [ ] Test all pages at 360px, 768px, 1024px, 1440px widths
- [ ] Verify touch targets on mobile (≥ 44px)
- [ ] Test image upload on mobile browsers

### Accessibility
- [ ] Keyboard navigation for all interactive elements
- [ ] ARIA labels on icon buttons, rating stars, status badges
- [ ] Focus management in modals (trap + restore)

### Error Handling
- [ ] Global HTTP error interceptor with user-friendly messages
- [ ] WebSocket disconnect handling — reconnect indicator, queued actions
- [ ] Form validation messages (inline, translated)

### Performance
- [ ] Lazy-load all feature routes
- [ ] Image optimization (resize uploads client-side before sending)
- [ ] OnPush change detection where appropriate

### Documentation
- [ ] Generate `api-contract.md` documenting all expected endpoints, request/response shapes
- [ ] Update this plan's checklist with final status

---

## 9. API Contract Notes

> This section is reconciled against `BACKEND_PLAN.md` §9–10 and is the authoritative frontend reference. All request/response bodies are **camelCase**. Path params use `:id` notation.

| Method | Endpoint | Body / Params | Response | Notes |
|--------|----------|---------------|----------|-------|
| POST | `/api/otp/send` | `{ phone }` (E.164) | `{ channel: 'whatsapp'\|'telegram', telegramBotUrl?, expiresIn }` | HTTP 200 even on Telegram-fallback branch. OTP component branches on `channel`, not HTTP status |
| POST | `/api/otp/verify` | `{ phone, code }` | `{ verified }` | Triggers background Telegram-link on first success |
| POST | `/api/auth/register` | `{ username, phone, country, governorate, password, role, workType?, bio?, hasShop?, shopLocation? }` | `{ token, role }` | Requires a verified OTP row for `phone`. **Auto-login** — store token and redirect on success |
| POST | `/api/auth/login` | `{ identifierType, identifier, password }` | `{ token, role }` | Password-only, no OTP step |
| POST | `/api/ai-suggest` | `{ description }` | `{ suggestedDescription, recommendedWorkType }` | Gemini Flash. `recommendedWorkType` is always a valid `WorkType` enum value |
| POST | `/api/requests` | `{ description, workType, images[] }` | `{ requestId }` | `images[]` are Supabase Storage URLs already uploaded client-side (max 5) |
| GET | `/api/requests/mine` | — | `Request[]` | User's own requests |
| GET | `/api/requests/:id/offers` | — | `Offer[]` | Reconnect / initial-load fallback for the live offers feed |
| POST | `/api/requests/:id/cancel` | — | `{ request }` | User cancels their own request — only allowed while status is `open` |
| GET | `/api/workers/me/requests` | — | `Request[]` | Open requests matching this worker's `workType` (used by requests feed) |
| POST | `/api/requests/:id/offer` | `{ price }` | `{ offerId, priceWithFee }` | Worker submits a price. Server computes `price × 1.05` — **never trust a client-sent total** |
| POST | `/api/requests/:id/decline` | — | `{ success }` | Worker declines a request — drops it from their feed |
| POST | `/api/requests/:id/choose` | `{ offerId }` | `{ jobId }` | User picks a handyman **by offerId** (not workerId). Creates a `pending` job |
| PATCH | `/api/jobs/:id/status` | `{ status: 'started'\|'finished'\|'canceled', paymentType?: 'online'\|'cash' }` | `{ job, paymentUrl? }` | **User-only.** `paymentType` required when `status = 'finished'`. `paymentUrl` is present in the response only for `finished` + `online` (Paymob hosted-checkout redirect) |
| POST | `/api/jobs/:id/cancel` | — | `{ job }` | **Worker-only** — distinct from the PATCH above. Allowed from `pending` or `started` |
| POST | `/api/webhooks/paymob` | Paymob payload | `200 OK` | HMAC-verified. Backend confirms payment and emits `payment_confirmed` → `job_status_changed` |
| POST | `/api/jobs/:id/payout` | — | `{ payout }` | Worker requests payout of their earnings balance via Paymob |
| GET | `/api/payments/history` | — | `Transaction[]` | Paginated list of user's payments with job summary, amount, status, and `method` |
| GET | `/api/workers/me/earnings` | — | `{ balance, transactions[] }` | Worker's payable balance + transaction history (online jobs only — cash jobs excluded) |
| GET | `/api/workers/me` | — | `Worker` | Authenticated worker's own profile |
| PUT | `/api/workers/me` | `{ bio?, hasShop?, shopLocation? }` | `{ worker }` | Edit worker profile |
| GET | `/api/workers/:id` | — | `Worker` (public) | Public profile: name, workType, bio, shop info, `averageRating`, `ratingsCount`, `completedJobsCount` |
| POST | `/api/jobs/:id/rate` | `{ stars, comment? }` | `{ rating }` | User-only, once per job, only after `status = 'finished'` |
| GET | `/api/workers/:id/ratings` | pagination params | `{ ratings[], average, count }` | Paginated ratings for a worker's public profile |

### WebSocket Events

> Event names match exactly what `WebSocketService` exposes — snake_case, not dot-notation. Backend emits these names verbatim.

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `new_request` | Server → matching Workers (`worktype:{type}` room) | `{ request }` | New request broadcast to workers with matching work type |
| `request_closed` | Server → other matching Workers | `{ requestId }` | Request no longer open (another worker was chosen) |
| `new_offer` | Server → requesting User | `{ offer }` | Worker submitted an offer |
| `offer_chosen` | Server → chosen Worker | `{ jobId }` | This worker was selected by the user |
| `offer_rejected` | Server → losing Workers | `{ requestId }` | Someone else was chosen for this request |
| `job_status_changed` | Server → User + Worker | `{ jobId, status }` | Covers `started`, `finished`, and user-initiated `canceled` transitions |
| `job_canceled_by_user` | Server → Worker | `{ jobId }` | User canceled the job — distinct event for targeted UI copy |
| `job_canceled_by_worker` | Server → User | `{ jobId }` | Worker canceled the job — renders "The handyman canceled" messaging |
| `payment_confirmed` | Server → User + Worker | `{ jobId, amount }` | Fired from Paymob webhook, immediately before `job_status_changed` → `finished` |

### Service-only endpoints — now confirmed in backend

The following endpoints were found in frontend services without a backend contract entry. All four have been **added to `BACKEND_PLAN.md` §7 and §9** in the same commit:

| Method | Endpoint | Service | Added to backend |
|--------|----------|---------|-----------------|
| GET | `/api/jobs/:id` | [`job.service.ts`](file:///home/nelatawy/Projects/Handy/frontend/src/app/core/services/job.service.ts) | ✅ Added — full `Job` response; accessible by user or worker |
| GET | `/api/jobs/active` | [`job.service.ts`](file:///home/nelatawy/Projects/Handy/frontend/src/app/core/services/job.service.ts) | ✅ Added — role-aware; returns active job or `null` |
| GET | `/api/users/me` | [`profile.service.ts`](file:///home/nelatawy/Projects/Handy/frontend/src/app/core/services/profile.service.ts) | ✅ Added — normal user's own profile; new `users/` blueprint |
| PUT | `/api/users/me` | [`profile.service.ts`](file:///home/nelatawy/Projects/Handy/frontend/src/app/core/services/profile.service.ts) | ✅ Added — editable fields: `username?`, `country?`, `governorate?` |

### Service ↔ Contract discrepancy fix log (2026-09-10)

All of the following were found by comparing service code to this contract table and corrected in the same commit:

| File | Was | Fixed to |
|------|-----|----------|
| `models.ts` → `OtpSendResponse` | `{ success, channel, telegramLink? }` | `{ channel, telegramBotUrl?, expiresIn }` |
| `models.ts` → `AuthResponse` | `{ token, role, user }` | `{ token, role }` (no embedded user object) |
| `models.ts` → `Worker` | `totalRatings`, `completedJobs` | `ratingsCount`, `completedJobsCount` |
| `models.ts` → `JobRequest.status` | `'open' \| 'closed'` | `'open' \| 'offer_selected' \| 'cancelled'` |
| `models.ts` → `Transaction` | `paymentType`, `status: 'confirmed'` | `method`, `status: 'paid'` |
| `request.service.ts` → `CreateRequestBody` | `imageUrls: string[]` | `images: string[]` |
| `request.service.ts` → `CreateRequestResponse` | `{ requestId, request }` | `{ requestId }` |
| `request.service.ts` → `declineOffer()` | sent body `{ offerId }` | no body (parameterless POST) |
| `request.service.ts` → `getOpenRequests()` | `GET /api/requests/open` | `GET /api/workers/me/requests` |
| `job.service.ts` → `updateStatus()` | returns `Observable<Job>` | returns `Observable<{ job, paymentUrl? }>` |
| `payment.service.ts` → `withdraw()` | `POST /api/workers/me/withdraw → { redirectUrl?, message }` | `POST /api/jobs/:id/payout → { payout }` |
| `profile.service.ts` | missing `getPublicWorkerProfile()` and `getWorkerRatings()` | added both |

---

## 10. Open Questions / Decision Log

| # | Question | Status | Decision |
|---|----------|--------|----------|
| 1 | Does the backend use `flask-socketio` (Socket.IO) or raw WebSockets? | ✅ Resolved | **`flask-socketio`** — use `socket.io-client` on the frontend |
| 2 | Should login require OTP re-verification (extra security), or just password? | ✅ Resolved | **No** — login is password-only. OTP component is still reusable if this changes later |
| 3 | Paymob integration style — iframe embed or redirect to hosted checkout? | ✅ Resolved | **Redirect** to Paymob hosted checkout page. Handle return/callback URL on our end |
| 4 | Does the backend provide country/governorate lists, or should the frontend bundle them? | ✅ Resolved | **Frontend bundles them** (static JSON/TS data). Backend does its own validation |
| 5 | Should we auto-login after successful registration? | ✅ Resolved | **Yes** — backend returns JWT on register success, frontend stores it and redirects to home |
| 6 | Image upload — direct to backend or presigned URL to cloud storage? | ✅ Resolved | **Supabase Storage bucket** — upload directly from frontend using Supabase client/presigned URL |
| 7 | Max number of images per request? | ✅ Resolved | **Max 5 images, max 20 MB per file** |

---

*Last updated: 2026-09-10 (v7 — Phase 5 complete: Transaction History, Earnings, Worker Profile, User Profile, routing + nav + i18n additions)*
