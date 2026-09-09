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

- [ ] Create Angular 21 project (`ng new handy --style=scss --routing --standalone`)
- [ ] Install dependencies: `@ngx-translate/core`, `@ngx-translate/http-loader`, `rxjs` (bundled), `socket.io-client` (backend confirmed `flask-socketio`)
- [ ] Set up `environment.ts` with `apiUrl` and `wsUrl` placeholders
- [ ] Set up global SCSS design system (`_variables.scss`, `_mixins.scss`, `_typography.scss`, `_reset.scss`, `_utilities.scss`)
- [ ] Import a clean web font (e.g. Inter for EN, Cairo or IBM Plex Arabic for AR)
- [ ] Configure `@ngx-translate` with `HttpLoader` and create skeleton `en.json` / `ar.json`

---

## 3. Phase 1 — Foundation

### Design System & Layout
- [ ] Define SCSS variables: primary sky-blue (`#0ea5e9` family), white, accent green/red, neutrals, shadows, border-radii, spacing scale
- [ ] Build responsive mixins (mobile-first breakpoints: 480, 768, 1024, 1280)
- [ ] Typography scale (headings, body, caption) with font-family fallback chains
- [ ] Global reset + base styles
- [ ] Utility classes (flex, grid, text-align, spacing)

### Core Services
- [ ] `AuthService` — login, register, logout, token storage, role getter, `isAuthenticated$` observable
- [ ] `WebSocketService` — connect/disconnect, auto-reconnect with backoff, typed event sending/receiving, channel multiplexing
- [ ] `NotificationService` — in-app toast queue driven by WebSocket events, configurable duration, action buttons
- [ ] `LanguageService` — get/set language, toggle `dir` attribute on `<html>`, persist preference in `localStorage`

### Interceptors
- [ ] `AuthInterceptor` — attach JWT `Authorization: Bearer <token>` header to outgoing requests
- [ ] `ApiUrlInterceptor` — prepend `environment.apiUrl` to relative paths

### Guards
- [ ] `AuthGuard` — redirect to `/login` if not authenticated
- [ ] `RoleGuard` — redirect if role doesn't match route data (`expectedRole: 'user' | 'worker'`)
- [ ] `NoAuthGuard` — redirect authenticated users away from login/register

### Models & Enums
- [ ] `WorkType` enum
- [ ] `JobStatus` enum (`Pending`, `Started`, `Finished`, `Canceled`)
- [ ] `PaymentType` enum (`Online = 'online'`, `Cash = 'cash'`) — sent to backend when marking a job Finished to indicate how the user paid
- [ ] `User`, `Worker`, `Request`, `Offer`, `Job`, `Rating` interfaces/types

### Shared Components
- [ ] **Star Rating** — read-only (filled/empty stars based on value) + interactive mode (click to set value), emits `ratingChange` event
- [ ] **Job Status Badge / Stepper** — visual stepper (Pending → Started → Finished) with canceled branch, current step highlighted
- [ ] **Language Switcher** — toggle button (EN/AR), calls `LanguageService`, updates direction
- [ ] **OTP Verification** — phone input → "Send OTP" → code input → "Verify" flow; handles WhatsApp primary + Telegram fallback link; emits `verified` event
- [ ] **Toast / Notification** — animated slide-in toast with icon, message, optional action; auto-dismiss
- [ ] **Country Prefix Dropdown** — searchable dropdown of country codes with flags, outputs selected code
- [ ] **Image Upload** — multi-file picker with drag-and-drop, previews, remove button; emits file list. **Max 5 images, max 20 MB per file.** Uploads go to **Supabase Storage bucket** via presigned URL / direct upload

### Layouts
- [ ] **Auth Layout** — centered card, Handy branding, language switcher, minimal chrome
- [ ] **Main Layout** — top navbar (branding, nav links by role, language switcher, notifications bell, logout), responsive sidebar on mobile, `<router-outlet>`

### Routing Skeleton
- [ ] Define route tree with lazy loading: `/auth/**`, `/user/**`, `/worker/**`
- [ ] Apply guards to route groups
- [ ] Default redirect logic based on auth state + role

---

## 4. Phase 2 — Auth

### Register Page
- [ ] Role toggle (Normal User / Worker) at top — switches visible fields
- [ ] Shared fields: username, phone (with country-prefix dropdown), country, governorate, password, confirm password
- [ ] Worker-specific fields: work-type dropdown, bio textarea, "Has a shop?" toggle → shop location input
- [ ] Client-side validation (required, password match, phone format, min lengths)
- [ ] Integrate OTP verification component after phone entry — block submission until verified
- [ ] Handle Telegram fallback display (show link/QR when backend returns `CHANNEL_NOT_LINKED`)
- [ ] On success → **auto-login**: backend returns JWT on successful registration, store it and redirect to the appropriate home page based on role
- [ ] All strings via `@ngx-translate`

### Login Page
- [ ] Identifier type selector (Username / Phone Number)
- [ ] Dynamic input (label + placeholder change based on selection)
- [ ] Password field
- [ ] Call backend `/api/auth/login`, store JWT, decode role, redirect to `/user/home` or `/worker/home`
- [ ] Error handling (invalid credentials, account not found, etc.)
- [ ] All strings via `@ngx-translate`

---

## 5. Phase 3 — Core Flow (User Side)

> **Priority:** This is the critical path. Get request → offers → choose → start → finish → rate working end-to-end first.

### Make a Request
- [ ] Form: image upload (optional, multi), description textarea (required), work-type dropdown
- [ ] "AI Suggestion" button → `POST /api/ai-suggest` with current description → show editable preview (suggested description + recommended work type) → accept fills form, dismiss keeps original
- [ ] "Confirm Request" → `POST /api/requests` → navigate to live offers screen
- [ ] "Cancel" → navigate back / clear form

### Live Offers Screen
- [ ] Request summary card at top
- [ ] Responsive grid of offer cards, populated **live via WebSocket**
- [ ] Each card: handyman name, quoted price, average rating (star-rating component, read-only), completed jobs count, shop badge (if applicable)
- [ ] Card click → expand/reveal **Choose** (green) + **Cancel** (red) buttons
- [ ] Only one card can be "selected" at a time (selecting another auto-deselects the previous)
- [ ] Choose → `POST /api/requests/{id}/choose` → creates job (Pending), disable other cards, show confirmation state
- [ ] Transition to Active Job Screen

### Active Job Screen (User)
- [ ] Display job details: handyman info, price, status stepper
- [ ] **Pending state:** "Mark as Started" button + "Cancel Job" (red) button
- [ ] **Started state:** "Mark as Finished" button (with price warning: "This will charge you [price]") + "Cancel Job" button
- [ ] **Finishing flow — payment type selection:** When the user taps "Mark as Finished", show a **payment method choice** before finalizing:
  - **"Pay Online"** (primary) — redirects to Paymob hosted checkout (sandbox). On successful Paymob callback/redirect, the job is marked Finished with `paymentType: 'online'` sent to the backend.
  - **"Paid in Cash"** — confirms that the user already paid the handyman in cash on-site. Marks the job Finished immediately with `paymentType: 'cash'` sent to the backend. No Paymob redirect.
  - Both buttons send `PATCH /api/jobs/{id}/status` with `{ status: 'finished', paymentType: 'online' | 'cash' }`.
- [ ] **Finished state:** read-only summary with a **payment type indicator** badge ("Paid Online" / "Paid in Cash"), payment confirmed indicator, **rating modal** auto-pops (star-rating interactive + optional comment → `POST /api/jobs/{id}/rate`)
- [ ] **Canceled state:** read-only, banner distinguishing user-cancel vs handyman-cancel (with handyman-cancel: "The handyman canceled — no charge was made" + "Make a new request" link)
- [ ] All state transitions update live via WebSocket

---

## 6. Phase 4 — Core Flow (Handyman Side)

### Requests Feed
- [ ] List/grid of open requests matching this handyman's work type
- [ ] Live updates via WebSocket (new requests appear, closed requests disappear)
- [ ] Each item clickable → navigates to request detail

### Request Detail
- [ ] Description, images (gallery/lightbox), location info
- [ ] **Accept** + **Decline** buttons
- [ ] Accept → navigate to pricing screen

### Pricing Screen
- [ ] Input for worker's price
- [ ] Live computed preview: "User will pay: [price + 5%]"
- [ ] Submit → `POST /api/requests/{id}/offer` → navigate to pending state (waiting for selection)
- [ ] WebSocket notification when chosen → navigate to active job
- [ ] WebSocket notification when request closed by another handyman being chosen → toast + return to feed

### Active Job Screen (Handyman)
- [ ] Mirror of user's active job screen, but **read-only for state transitions** (user drives Pending → Started → Finished)
- [ ] Handyman's own **Cancel Job** button (available before Finished) → `POST /api/jobs/{id}/cancel` → notifies user in real time
- [ ] State updates received live via WebSocket
- [ ] Finished state shows earnings info

---

## 7. Phase 5 — Payment & Profiles

### Payment (User)
- [ ] No separate "pay now" page — payment method choice is part of the "Mark as Finished" flow on the active job screen
- [ ] **Pay Online** path: redirect to Paymob hosted checkout page (sandbox). Handle return/callback URL to confirm payment and finalize the job
- [ ] **Paid in Cash** path: no Paymob involvement — job is finalized immediately with `paymentType: 'cash'`
- [ ] Transaction history screen: list of past payments with date, job summary, amount, status, and **payment type badge** (Online / Cash)

### Payment (Worker)
- [ ] Earnings balance display (sum of finished jobs' quoted prices)
- [ ] Payout flow via Paymob
- [ ] Transaction/payout history screen

### Worker Profile
- [ ] Display: name, work type, bio, shop info (if any), average rating (star component), rating count, completed jobs count
- [ ] Editable fields (bio, shop toggle/location) — `PUT /api/workers/me`

### User Profile (minimal)
- [ ] Display: name, phone, location
- [ ] Edit basic info

---

## 8. Phase 6 — Polish & QA

### RTL / Localization
- [ ] Complete `en.json` and `ar.json` with all strings
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

> To be filled in as endpoints are built/discovered. This section serves as a quick reference for frontend ↔ backend alignment.

| Method | Endpoint | Body / Params | Response | Notes |
|--------|----------|---------------|----------|-------|
| POST | `/api/auth/register` | `{ username, phone, country, governorate, password, role, workType?, bio?, hasShop?, shopLocation? }` | `{ message }` | Phone must already be OTP-verified |
| POST | `/api/auth/login` | `{ identifierType, identifier, password }` | `{ token, role }` | JWT returned |
| POST | `/api/otp/send` | `{ phone }` (E.164) | `{ success, channel }` | Calls AuthEvo |
| POST | `/api/otp/verify` | `{ phone, code }` | `{ verified }` | |
| POST | `/api/ai-suggest` | `{ description }` | `{ suggestedDescription, recommendedWorkType }` | Gemini Flash |
| POST | `/api/requests` | `{ description, workType, images[] }` | `{ requestId }` | |
| GET | `/api/requests/mine` | — | `Request[]` | User's own requests |
| POST | `/api/requests/{id}/offer` | `{ price }` | `{ offerId }` | Handyman submits offer |
| POST | `/api/requests/{id}/choose` | `{ offerId }` | `{ jobId }` | User picks handyman |
| PATCH | `/api/jobs/{id}/status` | `{ status, paymentType? }` | `{ job }` | Started / Finished / Canceled. `paymentType` (`'online'` \| `'cash'`) is **required** when `status = 'finished'` — tells the backend how the user paid |
| POST | `/api/jobs/{id}/rate` | `{ stars, comment? }` | `{ rating }` | |
| GET | `/api/workers/me` | — | `Worker` | |
| PUT | `/api/workers/me` | `{ bio?, hasShop?, shopLocation? }` | `{ worker }` | |
| GET | `/api/payments/history` | — | `Transaction[]` | |
| GET | `/api/workers/me/earnings` | — | `{ balance, transactions[] }` | |

### WebSocket Events (planned)

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `new_request` | Server → Worker | `{ request }` | New matching request available |
| `request_closed` | Server → Worker | `{ requestId }` | Request no longer open |
| `new_offer` | Server → User | `{ offer }` | Handyman submitted an offer |
| `offer_chosen` | Server → Worker | `{ jobId }` | This handyman was selected |
| `offer_rejected` | Server → Worker | `{ requestId }` | Another handyman was chosen |
| `job_status_changed` | Server → Both | `{ jobId, status }` | Job state transition |
| `job_canceled_by_user` | Server → Worker | `{ jobId }` | User canceled the job |
| `job_canceled_by_worker` | Server → User | `{ jobId }` | Handyman canceled the job |
| `payment_confirmed` | Server → Both | `{ jobId, amount }` | Payment successful |

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

*Last updated: 2026-09-10 (v2 — open questions resolved, cash payment option added)*
