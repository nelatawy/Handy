# Handy | هاندي

**فني موثوق، في متناول يدك.**

هاندي منصة تربط الناس المحتاجة لخدمة منزلية بالفنيين المناسبين القريبين منها — بنفس فكرة تطبيقات توصيل الركاب، بس للسباكة والكهرباء والنجارة وتقنية المعلومات. المستخدم ينشر طلبه، يستقبل عروض أسعار لحظية، يختار الفني المناسب، يتابع مهمته، ويدفع فقط بعد ما الشغل يخلص فعلاً.

*For the English version, scroll down to [English](#english).*

---

## جدول المحتويات (العربية)

- [الفكرة](#الفكرة)
- [ليه هاندي](#ليه-هاندي)
- [إزاي بتشتغل](#إزاي-بتشتغل)
- [مراحل المهمة](#مراحل-المهمة)
- [التقنيات المستخدمة](#التقنيات-المستخدمة)
- [هيكل المشروع](#هيكل-المشروع)
- [المستندات](#المستندات)

---

## الفكرة

| | |
|---|---|
| **المستخدم** | ينشر طلب ← يستقبل عروض لحظية من فنيين قريبين مناسبين ← يختار واحد ← يتابع المهمة ← يدفع فقط بعد الانتهاء ← يقيّم الفني |
| **الفني** | له تخصص ثابت (سباك، كهربائي، نجار، تقنية معلومات) ← يشوف الطلبات المناسبة له لحظيًا ← يسعّر ← يتم اختياره ← يقبض عند الإنجاز ← يبني تقييمه العام |
| **اللغات** | عربي (بتخطيط من اليمين لليسار) وإنجليزي، قابلين للتبديل داخل التطبيق |
| **الألوان** | أزرق سماوي وأبيض، مع لمسات أخضر/أحمر للحالات |

## ليه هاندي

سوق الخدمات المنزلية التقليدي شغّال على الكلام والتخمين: أسعار مش واضحة، فنيين مش موثوقين، ملهاش تقييمات حقيقية، وغالبًا بيتم طلب الدفع قبل ما حد يتأكد إن الشغل اتعمل صح. هاندي بيستبدل كل ده بمسار منظم — السعر يبان واضح من الأول، التقييمات حقيقية، والدفع ما بيتحصّلش غير بعد ما المستخدم يأكد إن المهمة خلصت.

## إزاي بتشتغل

### للمستخدم
1. **إنشاء طلب** — وصف، صور اختيارية، ونوع الفني المطلوب. فيه زرار **اقتراح بالذكاء الاصطناعي** يقدر يحوّل وصف مبسط لوصف أوضح ويقترح نوع الفني المناسب.
2. **استقبال عروض لحظية** — الطلب يتبث فورًا (عبر اتصالات لحظية مباشرة) للفنيين القريبين من نفس التخصص، وعروضهم (السعر، التقييم، عدد المهام المكتملة، وجود محل) تظهر كبطاقات فور وصولها.
3. **اختيار فني** — اختيار عرض معين يخطّر الفني فورًا ويقفل الطلب أمام باقي الفنيين.
4. **متابعة المهمة** — المستخدم هو اللي بينقّل المهمة بين حالاتها: **قيد الانتظار ← جارٍ التنفيذ ← مكتمل**.
5. **الدفع عند الانتهاء** — ما بيتحصّلش غير لما المستخدم يأكد إن المهمة **مكتملة**، عن طريق Paymob (بطاقة أو محفظة إلكترونية، بما فيها فودافون كاش)، أو نقدًا.
6. **تقييم الفني** — من 1 لـ 5 نجوم مع تعليق اختياري، بيظهر في بروفايل الفني العام.

### للفني
1. **يشوف الطلبات المناسبة** له لحظيًا، مفلترة حسب تخصصه.
2. **يراجع الطلب** ويقبل أو يرفض — الوصف، الصور، وتفاصيل الموقع.
3. **يسعّر شغله** — التطبيق بيضيف 5٪ رسوم منصة فوق سعره في السعر اللي يشوفه المستخدم؛ الفني بياخد سعره بالكامل من غير خصم.
4. **يتم إخطاره** لو تم اختياره، ويبدأ الشغل لما المستخدم يأكد إن المهمة **جارٍ تنفيذها**.
5. **يقبض فورًا** لما المستخدم يأكد إن المهمة **مكتملة** — الأرباح تضاف لرصيده داخل التطبيق، وقابلة للسحب عبر Paymob.
6. **يبني تقييمه**، وممكن يضيف موقع محله (لو عنده) في بروفايله العام.

## مراحل المهمة

```
قيد الانتظار ──▶ جارٍ التنفيذ ──▶ مكتمل ──▶ (يتم تحصيل الدفع + طلب التقييم)
      │                 │
      └─────────────────┴──▶ ملغاة (من المستخدم أو الفني — بدون أي دفع في أي وقت)
```

- المستخدم هو المحرّك الأساسي للمراحل (قيد الانتظار ← جارٍ التنفيذ ← مكتمل).
- **الفني** يقدر يلغي المهمة بشكل مستقل في أي وقت قبل **الاكتمال**، ويتم إخطار المستخدم فورًا.
- الدفع بيتحصّل فقط عند حالة **مكتمل** — فالإلغاء ماليش أي داعي لاسترجاع فلوس، لأنه أصلًا ماكانش اتخصم حاجة.

## التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| **الواجهة الأمامية** | Angular 21 (مكونات standalone وإدارة حالة بالـ signals)، SCSS، `@ngx-translate` (عربي/إنجليزي مع دعم RTL)، اتصال لحظي عبر Socket.IO |
| **الواجهة الخلفية** | Python + Flask (منظم على شكل blueprints)، `flask-socketio`، SQLAlchemy + Alembic |
| **قاعدة البيانات** | PostgreSQL (مستضافة على Supabase) |
| **التوثيق** | `flask-jwt-extended` وتشفير bcrypt لكلمات المرور |
| **الاتصال اللحظي** | Socket.IO — لبث الطلبات، العروض، الاختيارات، تغيّر حالة المهمة، والإلغاءات، لحظة بلحظة |
| **الدفع** | Paymob (بيئة تجريبية) — صفحة دفع مستضافة، تدعم البطاقات والمحافظ الإلكترونية؛ 5٪ رسوم منصة تضاف فوق سعر الفني |
| **التحقق من الهاتف** | AuthEvo — رمز تحقق عبر واتساب، مع تيليغرام كبديل تلقائي عند تعذّر الوصول |
| **المساعدة الذكية** | Gemini Flash — لتحسين وصف الطلب واقتراح نوع الفني المناسب |
| **تخزين الصور** | Supabase Storage (رفع مباشر من المتصفح، بحد أقصى 5 صور لكل طلب) |

## هيكل المشروع

```text
Handy/
├── README.md
├── APP_DESCRIPTION.md      # المواصفة الكاملة للمنتج: الأدوار، المسارات، الأنظمة
├── FRONTEND_PLAN.md        # معمارية الواجهة الأمامية، المراحل، وتعاقد الـ API
├── BACKEND_PLAN.md         # معمارية الواجهة الخلفية، المراحل، وتعاقد الـ API
├── MERGE_PLAN.md           # سجل التوفيق بين الواجهة الأمامية والخلفية
├── backend/
│   ├── app/
│   ├── migrations/
│   └── tests/
├── frontend/
│   ├── src/
│   └── public/
└── skills-lock.json
```

## المستندات

- **[APP_DESCRIPTION.md](./APP_DESCRIPTION.md)** — المواصفة الكاملة للمنتج: أدوار المستخدمين، مسارات الطلب والمهمة، أنظمة الدفع والتقييم، والتحقق من الهاتف.
- **[FRONTEND_PLAN.md](./FRONTEND_PLAN.md)** — معمارية Angular، هيكل الملفات، وتعاقد الـ API الرسمي (REST + WebSocket).
- **[BACKEND_PLAN.md](./BACKEND_PLAN.md)** — معمارية Flask، نموذج البيانات، وتعاقد الـ API الموحّد.

---

## English

*للنسخة العربية، ارجع لأعلى الصفحة.*

**A trust-first marketplace for home services.**

Handy connects people who need repair or installation work done with verified, nearby handymen — think of it as an Uber-style flow for plumbers, electricians, carpenters, and IT technicians. Users post a job, get live price offers, pick a worker, and pay only once the work is actually finished.

### Table of Contents

- [Overview](#overview)
- [Why Handy](#why-handy)
- [How It Works](#how-it-works)
- [Job Lifecycle](#job-lifecycle)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Documentation](#documentation)

### Overview

| | |
|---|---|
| **Users** | Post a job → get live offers from nearby matching handymen → choose one → track the job → pay only when finished → rate the handyman |
| **Handymen** | Have a fixed trade (Plumber, Electrician, Carpenter, IT) → see matching requests in real time → quote a price → get selected → get paid on completion → build a public rating |
| **Languages** | Arabic (RTL) and English, switchable in-app |
| **Theme** | Sky-blue & white, with green/red semantic accents |

### Why Handy

The traditional local home-services market runs on word of mouth and guesswork: unclear pricing, unverified workers, no real reviews, and payment that's often demanded before the job is trusted to be done. Handy replaces that with a structured flow — clear pricing shown up front, real ratings, and payment that's only ever charged after the user confirms the job is finished.

### How It Works

**For users**
1. **Create a request** — description, optional photos, and a worker type. An **AI Suggestion** button (Gemini Flash) can turn a rough description into a polished one and recommend the right worker type.
2. **Get live offers** — the request broadcasts in real time to nearby matching handymen; their offers (price, rating, completed jobs, shop info) stream in as cards live.
3. **Choose a handyman** — picking one notifies them instantly and closes the request to everyone else.
4. **Track the job** — move it through its lifecycle yourself: Pending → Started → Finished.
5. **Pay on completion** — charged only when you mark the job *Finished*, via Paymob (card or wallet, including Vodafone Cash) or cash.
6. **Rate the handyman** — 1–5 stars plus an optional comment, feeding their public profile.

**For handymen**
1. **See matching requests** in real time, filtered to your trade.
2. **Review and accept or decline** — description, photos, and location context.
3. **Quote your price** — the app adds a 5% platform fee on top for the user's display price; you receive exactly what you quoted.
4. **Get notified** if chosen, and start work once the user marks the job *Started*.
5. **Get paid** the moment the user marks the job *Finished* — funds land in your in-app balance, withdrawable via Paymob.
6. **Build your rating** and optionally list a shop location on your public profile.

### Job Lifecycle

```
Pending ──▶ Started ──▶ Finished ──▶ (payment charged, rating prompt)
   │            │
   └────────────┴──▶ Canceled (by user or handyman — no payment ever taken)
```

- Driven mainly by the **user** (Pending → Started → Finished).
- The **handyman** can independently cancel at any point before *Finished*; the user is notified in real time.
- Payment is charged **only** at *Finished* — so a cancellation never requires a refund, since no money was ever taken.

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Angular 21 (standalone components, signals), SCSS, `@ngx-translate` (AR/EN, RTL), `socket.io-client` |
| **Backend** | Python + Flask (blueprints), `flask-socketio`, SQLAlchemy + Alembic |
| **Database** | PostgreSQL (Supabase-hosted) |
| **Auth** | `flask-jwt-extended`, bcrypt |
| **Realtime** | WebSockets via Socket.IO — live requests, offers, selections, job-status changes, cancellations |
| **Payments** | Paymob (sandbox) — hosted-checkout redirect, handles cards and mobile wallets; 5% platform fee added on top of the worker's price |
| **Phone verification** | AuthEvo — OTP over WhatsApp, automatic Telegram fallback |
| **AI assistance** | Gemini Flash — description polishing + worker-type suggestion |
| **Image storage** | Supabase Storage (client-side upload, max 5 images per request) |

### Project Structure

```text
Handy/
├── README.md
├── APP_DESCRIPTION.md      # Full product spec: roles, flows, systems
├── FRONTEND_PLAN.md        # Frontend architecture, phases, API contract
├── BACKEND_PLAN.md         # Backend architecture, phases, API contract
├── MERGE_PLAN.md           # Frontend↔backend reconciliation log
├── backend/
│   ├── app/
│   ├── migrations/
│   └── tests/
├── frontend/
│   ├── src/
│   └── public/
└── skills-lock.json
```

### Documentation

- **[APP_DESCRIPTION.md](./APP_DESCRIPTION.md)** — full product spec: user roles, request/job flows, payment and rating systems, phone verification.
- **[FRONTEND_PLAN.md](./FRONTEND_PLAN.md)** — Angular architecture, folder structure, and the authoritative REST/WebSocket API contract.
- **[BACKEND_PLAN.md](./BACKEND_PLAN.md)** — Flask architecture, data model, and the reconciled API contract.
