# Frontend Build Prompt (for Claude Code) — Handy

Use this as the initial prompt to Claude Code when building the frontend.

---

You are building the **frontend** of "Handy", a two-sided marketplace web app (like Uber, but for hiring handymen: plumbers, electricians, carpenters, IT) instead of drivers.

## Stack & Global Requirements
- **Angular 21** (standalone components, Angular signals for state where sensible, Angular Router, reactive forms).
- **Styling:** hand-rolled SCSS or a component library of your choice — **do not use Tailwind**. Keep it consistent and fully mobile-responsive.
- **Color theme:** sky blue and white as the primary palette throughout the app (accent colors like green/red are still fine for semantic actions like "choose"/"cancel").
- **App name:** "Handy" — use it in the header/branding, page titles, etc.
- **Localization (i18n):** the app must support **Arabic and English**, switchable via a language toggle. Arabic must render as **RTL** (mirror layout, not just flip text direction) — use Angular's built-in i18n tooling or a library like `@ngx-translate/core` (your call, document the choice). All user-facing strings must go through the translation system from the start, not be hardcoded.
- **Realtime:** use **native WebSockets** (or a thin wrapper like `rxjs` + the `WebSocket` API, or `socket.io-client` if the backend uses `flask-socketio`) for all live updates — **no polling** anywhere (live offers, live request feeds, notifications).
- **Worker type:** model as a proper TypeScript **enum** (e.g. `enum WorkType { Plumber = 'plumber', Electrician = 'electrician', Carpenter = 'carpenter', IT = 'it' }`), used consistently across forms, dropdowns, and display components — never as raw strings.
- Communicate with a **Flask REST API backend** (base URL configurable via environment file, e.g. `environment.ts` → `apiUrl`), plus a WebSocket endpoint (`environment.ts` → `wsUrl`).

## Pages / Features to Build

### 1. Auth
- **Register page**: role toggle (Normal User vs Worker) at the top. Shared fields: username, phone number with a country-prefix dropdown, country, governorate, password, confirm password.
  - **Phone OTP verification (AuthEvo):** after the phone number is entered (format it to **E.164** before sending, e.g. `+201234567890`), trigger an OTP send through the backend (which calls AuthEvo's `/v1/otp/send`) and show an OTP-entry step/modal, with copy noting the code is sent **via WhatsApp**. Registration cannot be submitted/completed until the OTP is verified via the backend's verify call. Build this as its own reusable component (`otp-verification`) since it may be reused at login for extra-security flows.
    - Handle the **Telegram fallback**: if the backend returns a "channel not linked" error (surfaced from AuthEvo's `409 CHANNEL_NOT_LINKED`), show the user the provided Telegram bot link (as a tappable link and/or QR code) instead of a WhatsApp message, with copy like "We couldn't reach you on WhatsApp — tap this link in Telegram to get your code instead." No need to poll — once they tap Start in Telegram, the verify step just works when they enter the code they receive there.
  - If "Worker" is selected, show additional fields: **Work type** dropdown (from the `WorkType` enum), a **short description/bio** textarea, and a **"Has a shop?"** toggle — when toggled on, reveal a **shop location** input.
  - Client-side validation (required fields, password match, phone format).
- **Login page**: a select control for identifier type (Username / Phone Number), the identifier input itself (label/placeholder changes based on the select), and password. On success, store the auth token (e.g. JWT) and route to the correct home page based on role (user vs worker).

### 2. Normal User — Make a Request
- Form with: optional multi-image upload (with preview + remove), required description textarea (block submit if empty), worker-type dropdown (from the `WorkType` enum).
- An **"AI Suggestion"** button next to the description field: sends the current rough text to a backend endpoint (`POST /api/ai-suggest`, backed by Gemini Flash) and shows the returned suggested description + recommended worker type in an editable preview the user can accept (fills the form) or dismiss.
- **Confirm Request** and **Cancel** buttons. Confirm calls the backend to create the request and navigates to a live "offers" screen for that request.

### 3. Normal User — Live Offers Screen
- Shows the request summary at the top.
- Below it, a responsive grid/list of cards that fills in **live over a WebSocket connection** as handymen accept the request. Each card shows: handyman name, quoted price, average star rating, number of completed jobs, and (if applicable) a small "has a shop" badge with the shop location.
- Clicking a card reveals two buttons on that card: **Choose** (green) and **Cancel** (red).
  - Choose → confirms the hire, calls the backend, disables/hides other cards, shows a "waiting for handyman" or "confirmed" state. This creates the job in **Pending** state — no payment happens here.
  - Cancel → deselects that card, returns to normal browsing state; selecting another card should behave the same way (deselect the previous one automatically).

### 4. Normal User — Active Job Screen
Once an offer is chosen, the user is taken to (or can return to) an **active job screen** for that job, showing its current state and the controls the user uses to move it forward:
- **Pending** → shows a "Mark as Started" button (enabled once the handyman has actually shown up/begun, at the user's discretion) and a "Cancel Job" button (red — cancels with no charge, since nothing has been paid yet).
- **Started** → shows a "Mark as Finished" button (this is the one action that triggers payment — make the copy clear, e.g. "Marking this finished will charge you [price]") and a "Cancel Job" button.
- **Finished** → read-only state showing the job is complete and paid; this is also the trigger point for the **rating modal** (1–5 stars, required, + optional comment) to appear automatically.
- **Canceled** → read-only state. If the **handyman** canceled (rather than the user), show a clear real-time notification/banner, e.g. "The handyman canceled this job — no charge was made," so the user isn't left wondering what happened; give them an easy way to go make a new request.

All of these state transitions arrive/are confirmed via WebSocket events so the screen updates live even if the handyman-side action (e.g. a handyman-initiated cancel) happens while the user has the screen open.

### 5. Handyman — Requests Feed
- List/grid of open requests matching this handyman's work type, updating **live via WebSocket** as new ones come in.
- Each item is clickable → request detail view.

### 6. Handyman — Request Detail
- Shows description, uploaded image(s) if present (gallery/lightbox), and any location info.
- **Accept** and **Decline/Cancel** buttons.
- Accept → navigates to a **pricing screen**: input for the worker's price; show a computed "user will pay: price + 5%" preview before submit.
- After submitting a price, show a pending state until either they're chosen (WebSocket notification/toast + move to "active job" state) or the request is closed by another handyman being chosen (toast + remove from active list).

### 7. Handyman — Active Job Screen
Mirrors the user's active job screen but from the handyman's side: shows the current state (Pending / Started / Finished / Canceled) as set by the user, since **the user drives Pending → Started → Finished**, not the handyman. The handyman does get their own **Cancel Job** button, available any time before "Finished" — using it should immediately notify the user (via WebSocket/toast) that the handyman canceled. Make clear in the UI that no payment has occurred at this point regardless of state, until "Finished."

### 8. Handyman — Profile
- Shows their info, work type, short description/bio, shop info (if any), average rating (stars), number of ratings, and completed job count.

### 9. Payment Screens (both roles)
- **User:** no separate "pay now" step — payment is triggered automatically as part of marking a job **Finished** on the active job screen, handled through **Paymob** (embed/redirect per Paymob's checkout flow — sandbox for now). Also show a transaction history screen for past charges.
- **Worker:** earnings balance (only reflecting jobs actually marked Finished) and payout flow through **Paymob**, transaction/payout history.

### 10. Shared/Global
- **Notification/toast system**, driven by WebSocket events: handyman chosen, request closed, job started, job finished (payment confirmed), job canceled by user, **job canceled by handyman** (distinct message so the user knows it wasn't their own action), new offers arriving, new matching request arriving.
- Route guards so user-only and worker-only pages are protected based on role stored in the auth token.
- A shared **star rating** component (read-only display mode + interactive input mode) used in offer cards, profiles, and the rating modal.
- A shared **job status badge/stepper** component (Pending → Started → Finished, or Canceled) reused on both the user's and handyman's active job screens.
- A shared **language switcher** component (EN/AR) that also toggles document direction (`dir="rtl"` / `dir="ltr"`).
- A shared **OTP verification** component (used at registration, and optionally reusable at login).

## Notes
- Keep API contracts flexible but documented in a `README` or `api-contract.md` you generate as you go, so the backend can match it (or ask me for the backend's actual OpenAPI/route list and conform to it if I provide one).
- Prioritize the request → offers → choose → start → finish (pay) → rate flow end-to-end first, then flesh out profile/payment screens.
- Ask me clarifying questions if anything about routing, state management approach, the exact WebSocket message schema, or AuthEvo's actual client-side integration (once I share their docs) needs a decision before you proceed.
