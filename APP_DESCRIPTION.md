# Handy — App Description & Functionality

## Overview
Handy is a two-sided marketplace web app that connects **normal users** who need repair/installation work done with **handymen (workers)** who can do that work — similar in spirit to how Uber connects riders and drivers. Users post a job request with a description, an optional photo, and a required worker type. Nearby handymen of that type see the request, can accept it and quote a price, and the user picks one to hire. Payments run through **Paymob** (handling cards and wallets, including Vodafone Cash, as just one of the payment methods it supports), with a 5% platform fee. After a job is completed, the user rates the handyman.

## Architecture
- **Frontend:** Angular 21, bilingual (Arabic + English) with a sky-blue and white visual theme. No Tailwind — styling via SCSS/component library of choice.
- **Backend:** Python (Flask)
- **Database:** PostgreSQL via Supabase
- **AI Suggestion:** Gemini Flash API (chosen as the free-tier option) — turns a rough job description into a polished description + recommended worker type
- **Realtime:** WebSockets (not polling) for live offers, live request feeds, and notifications
- **Payments:** Paymob (sandbox for this demo) as the single payment gateway — handles card payments and mobile wallets (Vodafone Cash among others) without the app needing to integrate Vodafone Cash directly
- **Phone verification:** AuthEvo for OTP verification of phone numbers at registration/login — delivers the code over **WhatsApp** (with an automatic Telegram fallback for numbers WhatsApp can't reach)

## User Roles
1. **Normal User** — posts job requests, hires a handyman, pays, rates the handyman afterward.
2. **Handyman (Worker)** — has a fixed work type (Plumber, Electrician, Carpenter, IT for now — modeled as an **enum**), receives matching requests, accepts/declines, quotes a price, gets paid, builds up a public rating. Can optionally list a shop.

---

## Localization & Theming
- The app supports **Arabic and English**, with a language switcher and full RTL layout support for Arabic.
- Primary color palette: **sky blue and white**, used consistently across both languages/layouts.
- The app's name is **Handy**.

---

## Authentication

### Registration
Single registration flow that starts by asking the person to choose an account type:
- **Normal User**, or
- **Worker (Handyman)**

Common fields for both:
- Username
- Phone number, with a **country-prefix dropdown** next to the phone field
- Country
- Governorate
- Password
- Confirm password

**Phone verification:** after entering a phone number, the user must verify it via an **OTP sent through AuthEvo over WhatsApp** before registration can complete. This is a required step (not optional), for both user and worker roles. Right after the OTP step succeeds, the app also calls AuthEvo's Telegram-link endpoint in the background so the Telegram fallback is ready for any future verification (e.g. re-login) without the user having to do anything extra — unless WhatsApp genuinely can't reach them, in which case they're shown a one-tap Telegram link to receive the code there instead.

If **Worker** is selected, additional fields appear:
- **Work type** dropdown (backed by an enum): Plumber, Electrician, Carpenter, IT
- **Short description / bio** (free text, e.g. experience, specialties)
- **Has a shop?** toggle (Yes/No)
  - If Yes: an additional field to enter the **shop location**

### Login
Three fields:
1. A select control to choose the login identifier type: **Username** or **Phone Number**
2. An input for that identifier (username or phone number, depending on the selection above)
3. Password field

(AuthEvo OTP re-verification over WhatsApp can optionally be required again at login for extra security, e.g. on a new device — flagged as a decision point for the build. AuthEvo also offers TOTP-based 2FA as a separate optional layer if stronger login security is wanted later.)

---

## Normal User Flow

### 1. Create a Request
A "Make a Request" button opens a request form with:
- **Image upload** (optional, supports multiple images)
- **Description** (required, cannot be empty)
- **Worker type** dropdown (enum: Plumber / Electrician / Carpenter / IT)
- **Confirm Request** button and **Cancel** button

An **AI Suggestion** button is available while filling this form: the user types a short/rough description, and the app calls Gemini Flash to return a polished, more complete job description plus a recommended worker type. The user can accept or edit the suggestion before confirming.

### 2. Broadcast & Offers
On confirm, the request is broadcast **over WebSockets** to nearby handymen whose work type matches the request. As handymen accept, they appear to the user in **real time** as responsive cards, each showing:
- Handyman's name
- Handyman's **quoted price**
- Handyman's **average rating** (stars) and number of completed jobs
- Whether they have a shop (and its location, if so)

### 3. Choosing a Handyman
Clicking a handyman's card reveals two buttons:
- **Choose (green):** confirms this handyman for the job. This:
  - Sends a real-time notification to the chosen handyman.
  - Hides the request from all other handymen who had it listed (it's no longer open).
- **Cancel (red):** deselects this card so the user can pick a different handyman. Clicking a different card has the same deselecting effect on the previous choice.

### 4. Job Lifecycle
Once a handyman is chosen, a **job** is created with status **Pending**. From here, the **user** (not the handyman) drives the job forward through its states:
- **Pending** → the job has been assigned but work hasn't started yet.
- **Started** → the user marks the job as started once the handyman begins work.
- **Finished** → the user marks the job as finished once the work is done to their satisfaction. **This is the only point at which payment is actually charged** — see Payment below.
- **Canceled** → the user can cancel a pending/started job. The **handyman can also cancel** a job at any point before it's finished; if they do, the user is notified immediately (in real time) that the handyman canceled.

No money changes hands for **Pending**, **Started**, or **Canceled** states — see Payment below.

### 5. Payment
Payment is **only** ever charged when the user explicitly marks the job **Finished** — not when the handyman is chosen, not while the job is "Started". At that point, the app charges the user the exact quoted price (worker's price + 5% platform fee) through **Paymob**, which handles the underlying payment method (card, wallet, Vodafone Cash, etc.) — the app itself doesn't need to integrate any wallet provider directly. Verification ensures the user is only ever charged the price the worker posted — never more, never less.

Because nothing is charged until "Finished," a cancellation (by either the user or the handyman) never requires a refund — the user's money was never touched, so canceling simply closes the job with nothing owed.

### 6. Rating
As soon as the job reaches its final state — **Finished** — the user is prompted to **rate the handyman**:
- 1–5 star rating (required)
- Optional written comment
This updates the handyman's public average rating, shown on their profile and on their offer cards for future jobs. Canceled jobs are not rated (there's no completed work to rate) — the user simply sees the job close out and can post a new request if they still need the work done.

---

## Handyman Flow

### 1. Incoming Requests Feed
Each handyman has a page listing all open requests matching their work type, updating in real time over WebSockets as new matching requests come in.

### 2. Reviewing a Request
Tapping a request opens its details: description, uploaded image(s) (if any), and location context. The handyman can:
- **Cancel/Decline**, or
- **Accept**

### 3. Quoting a Price
On accept, the handyman is taken to a pricing screen where they enter their price for the job. The app automatically adds a **5% platform fee** on top for display to the user (the handyman still receives their entered price).

### 4. Selection Notification
If chosen by the user, the handyman receives a real-time notification that they've been selected and the job is now theirs, starting in **Pending** state. If another handyman is chosen instead, this handyman's offer is cleared from that request.

### 5. Job Progress & Cancellation
The handyman can see the job's current state (Pending / Started / Finished / Canceled) but the **user** is the one who moves it from Pending → Started → Finished. The handyman does have their own **Cancel** action available at any point before the job is finished — if they use it, the user is notified in real time that the handyman canceled, and the job closes with no money involved (since payment is never taken before "Finished").

### 6. Getting Paid
Money only moves once the user marks the job **Finished**. At that point, the handyman's earnings (their quoted price — the 5% fee is added on top, not deducted) are released to their in-app balance and can be withdrawn through **Paymob**, using whichever payout method Paymob supports for the worker's account. If the job is canceled instead (by either side) before reaching "Finished," no payment was ever taken, so there's nothing to release or reverse.

### 7. Ratings
The handyman accumulates ratings from finished jobs, visible on their public profile and shown to users evaluating offers.

### 8. Shop Profile (optional)
A handyman can optionally indicate they have a **shop**. If so, they provide a **shop location**, which is shown on their public profile and can help build trust with users.

---

## Job Lifecycle (states)
A job (created once a user chooses a handyman's offer) moves through these states, driven mainly by the **user**:
1. **Pending** — job assigned, work not yet started.
2. **Started** — user marks the job as started once the handyman begins.
3. **Finished** — user marks the job as finished once the work is done. This is the **only** trigger for payment.
4. **Canceled** — the user can cancel from Pending/Started; the **handyman can also cancel independently** at any point before Finished, which immediately notifies the user in real time.

No payment is ever charged for Pending, Started, or Canceled — only for Finished, and only by the user's explicit action.

## Payment System
- **Paymob** (sandbox for this demo) is the sole payment gateway — it natively supports cards and mobile wallets (including but not limited to Vodafone Cash), so the app does not need a separate wallet-provider integration.
- Payment is charged **only when the user marks a job Finished** — never at offer-selection time, and never while a job is Pending or Started.
- The platform takes a **5% fee** per transaction, added on top of the worker's quoted price (the user pays worker price + 5%; the worker receives exactly what they quoted).
- Verification logic ensures the amount charged to the user and the amount released to the worker always reconcile against the price the worker posted — protecting both sides from being over- or under-charged.
- Because charging only happens at "Finished," cancellations (by either party) never require a refund flow — no money was ever taken.

## Rating System (Handymen)
- Ratings are 1–5 stars, submitted by the user once a job reaches the **Finished** state, with an optional text comment.
- The rating prompt is shown to the user as soon as they mark the job Finished (which is also the moment payment is charged).
- Canceled jobs are never rated.
- A handyman's profile stores: average rating, total number of ratings, and total completed (finished) jobs.
- Average rating (and job count) is surfaced on:
  - The handyman's public profile
  - Their offer card shown to users during the "choose a handyman" step
- A handyman cannot rate themselves; a user can only rate a handyman once per finished job.

## Phone Verification (AuthEvo)
- Phone numbers are verified via **OTP delivered over WhatsApp through AuthEvo** at registration (phone numbers are stored/sent in **E.164 format**, e.g. `+201234567890`).
- The registration flow doesn't complete until the OTP is confirmed.
- If WhatsApp can't reach a number, AuthEvo automatically falls back to a **Telegram** one-tap link — the app links Telegram proactively right after a successful OTP so this fallback is ready before it's ever needed again.
- AuthEvo also offers an optional **TOTP-based 2FA** (authenticator app codes) that isn't part of the core flow here but could be added later for extra account security.
- This applies to both normal users and workers.

## Worker Types (enum — initial values)
- Plumber
- Electrician
- Carpenter
- IT

Modeled as a proper **enum** in both frontend (TypeScript enum/union type) and backend (Python enum + a Postgres enum or check-constrained lookup), not as free text — new types get added by extending the enum in both places.
