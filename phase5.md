# Phase 5 — End-to-End Polish, Statistics & Demo: Implementation Prompt

> **How to use this file:** Self-contained work order for an engineer or AI coding agent. This is the **finishing** phase — no new subsystems. It makes the whole thing demoable and legible: a reproducible **seed script**, the finished **mobile Statistics screen**, an end-to-end **polish pass**, a strong **root README with architecture + sequence diagrams**, and a **recorded demo**. The goal is a project someone can clone, run in minutes, and understand at a glance — the difference between "works on my machine" and a resume-grade flagship.

---

## Context — where the code stands after Phase 4

All three core projects are functional:

```
Ipay/
├── backend/     Express 5 + Mongoose + TS. auth (OTP + login/UPI PIN, hashed), session pairing + ws
│               revocation, bank, transaction (via services/transfer.ts), gateway (orders).
├── web-demo/    MV3 extension: QR pairing, login-PIN lock, real wallet data, window.upi provider +
│               approval flow (direct + order-based gateway pay), instant ws logout.
├── gateway/     InstaPay Checkout SDK + demo merchant store (Vite 5).
├── mobile-app/  Expo/RN: login, pay, pairing scanner, Linked Devices, Login-PIN settings.
│               ⚠ StaticsScreen.tsx is still a 15-line stub.
└── landingpage/ Marketing site.
```

**Facts to build on:**
- Backend seeding is currently manual (OTP flow → setup-profile → bank/create → bank/link → gateway/merchant). There is **no seed script** — Phase 5 adds one.
- `mobile-app/src/screens/StaticsScreen.tsx` renders only "Statics Screen". `HomeScreen.tsx` already fetches `/transaction/history/:upiId` and uses `api` from `utils/api` — reuse those patterns.
- The extension's `StatisticView` already derives net/received/sent from real history (Phase 2) but its bar chart is decorative.
- There is **no root `README.md`**. Only `web-demo/README.md` and `landingpage/README.md` (default scaffolds).
- Key endpoints for stats: `GET /transaction/history/:upiId` returns `[{ senderUpiId, receiverUpiId, amount, status, createdAt }]`.
- Two PINs, session pairing, ws revocation, `window.upi`, and order-based gateway anti-tamper are the headline concepts the README must explain.

---

## Task 1 — Reproducible demo seed script (backend)

Manual seeding makes demos slow and flaky. Add `backend/src/scripts/seed.ts` (run via an npm script, e.g. `"seed": "ts-node src/scripts/seed.ts"`).

- Connect to `MONGO_URI`; **guard against clobbering** a real DB (only run when `MONGO_URI` points at a local/dev DB, or require a `--force` flag; print a clear warning).
- Idempotently create:
  - **Payer** user: `name`, `mobileNumber`, `email`, `upiId` (`<mobile>@ipay`), `upiPin` (e.g. `1111`), `loginPin` (e.g. `1234`), a linked `BankAccount` with a healthy balance (e.g. ₹50,000), `qrCodeData`.
  - **Merchant** user: same shape, its own `upiId`, a linked account (balance 0), and a `Merchant` record via the gateway model → print its `keyId`.
  - A couple of **contact** users so history/QR-pay demos have counterparties.
  - A few seeded `Transaction`s (mixed sent/received/failed) so Statistics and History aren't empty on first load.
- **Print a summary** at the end: each user's mobile/upiId/upiPin/loginPin, the merchant `keyId`, and the exact next steps ("paste keyId into the store", "log into the mobile app with 1111…").
- Reuse the model hooks (PINs hash on save) rather than hand-hashing.

**Acceptance criteria**
- `npm run seed` on a fresh local DB produces a ready-to-demo world and prints all credentials + the merchant `keyId`.
- Re-running it doesn't duplicate users (upsert by `mobileNumber`/`upiId`).
- It refuses to run against a non-local `MONGO_URI` without `--force`.

---

## Task 2 — Finish the mobile Statistics screen

Replace the `StaticsScreen.tsx` stub with a real, data-backed screen matching the app's dark aesthetic (see `HomeScreen`/`LinkedDevicesScreen` for palette and patterns).

- It needs the user's `upiId`. `StaticsScreen` is a tab in `TabNavigator` — pass/derive the `userId`/`upiId` (fetch `/auth/me` or reuse the pattern `HomeScreen` uses to load the user), then `GET /transaction/history/:upiId`.
- Compute and show: **Total Received**, **Total Sent**, **Net Flow** (received − sent) over successful transactions, and a **transaction count**.
- Render a simple **bar chart of recent activity** (e.g. last 6 days or last N transactions) using plain `View`s (no chart lib needed) — bar heights scaled to the max amount.
- A **recent transactions** list (counterparty, direction, amount in INR, relative time) — reuse the direction logic (`positive = receiverUpiId === myUpi`).
- Loading, empty ("No transactions yet"), and error states.
- Refresh on focus (`useFocusEffect`), like `LinkedDevicesScreen`.

**Acceptance criteria**
- The Statistics tab shows real totals and history for the logged-in user, styled consistently, with proper loading/empty/error states.
- Numbers reconcile with the Home screen and the extension wallet.

---

## Task 3 — (optional) Real chart in the extension Statistics

If time permits, upgrade `web-demo/src/components/StatisticView.tsx` so the bar chart reflects **real** recent transactions (from `WalletContext`) instead of the decorative `BARS`. Keep the existing net/received/sent cards. Remove or clearly relabel any remaining illustrative element.

**Acceptance criteria**
- The extension chart is driven by real history, or is explicitly labelled illustrative — nothing looks like fabricated data.

---

## Task 4 — End-to-end polish pass

Walk the whole product and smooth rough edges. Produce a short written checklist of what you fixed.

- **Config hygiene:** every runnable piece has a documented `.env.example` and sensible defaults (`backend` PORT/MONGO/JWT, `web-demo` `VITE_API_BASE_URL`, `gateway` `VITE_API_BASE`/`VITE_INSTAPAY_KEY`, `mobile-app` `BASE_URL`). Flag the one hardcoded value that must be the dev machine's LAN IP (`mobile-app/src/utils/api.ts`) and, ideally, move it to Expo config/env.
- **States:** confirm loading / empty / error states exist for every network-backed view (mobile Home/History/Statistics/Linked Devices; extension Home/History/Statistics/Approval; store checkout). No raw spinners-forever or blank screens.
- **Naming:** the product is called both "InstaPay" and "iPay" — pick one for user-facing copy and make it consistent (code identifiers can stay).
- **Happy-path smoke:** run the full flow once and fix anything broken:
  checkout (store) → `window.upi` detect → connect consent → approval popup (verified order) → UPI PIN → backend settles → **both** phone history and extension history reflect it → **terminate session from phone** → extension logs out live.
- **Failure paths:** wrong UPI PIN, wrong login PIN (+ lockout), insufficient balance, rejected/closed approval, double-paid order (409), paying after termination (401) — each shows a clear message, never a hang.

**Acceptance criteria**
- A written "polish checklist" enumerating fixes.
- The happy path and each failure path behave cleanly end to end.

---

## Task 5 — Root README + architecture & sequence diagrams

Write a strong top-level `README.md` — this is the resume centerpiece; make it legible to someone who has never seen the repo.

Include:
1. **One-paragraph pitch** + the problem (the laptop→gateway→phone→PIN round-trip friction) and that this is a **simulated prototype** (no real bank/NPCI/RBI money).
2. **The three-services inspiration** (UPI app · WhatsApp-Web QR session · Phantom-style `window.upi` injection) and how each maps to a project.
3. **Architecture diagram** (mermaid) — mobile app ⇄ backend ⇄ extension ⇄ gateway/merchant, with the data stores and the ws channel.
4. **Security model** — server-side custody (nothing sensitive in `localStorage` beyond session token + JWT), **login PIN vs UPI PIN**, session pairing, **instant ws revocation** (why not GraphQL/polling), and the **order-based gateway anti-tamper** (wallet charges the server order, not page params).
5. **Sequence diagrams** (mermaid) for the headline flows: **QR session pairing**, **`window.upi` connect + pay**, **gateway order checkout**, **remote session termination**.
6. **Repo layout** (the four projects + backend) and **setup/run** instructions for each, plus the **seed script** as the fast path.
7. **Tech stack** and an honest **"simulation / not production"** note.

Also refresh the default scaffold `web-demo/README.md` (and `landingpage/README.md`) or point them at the root.

**Acceptance criteria**
- A newcomer can read the README, run `npm run seed`, start the four pieces, and reach the demo without tribal knowledge.
- Mermaid diagrams render on GitHub (fenced ```mermaid blocks) and match the actual code.

---

## Task 6 — Recorded demo (GIF/video)

Capture the money-shot flows and embed them so the README sells itself.

- **Shot list** (record each as a short GIF/clip):
  1. **Pairing** — extension shows QR → scan on phone → wallet unlocks (create login PIN) → real balance/history.
  2. **dApp pay** — the test page or store: `window.upi` connect → approval popup → UPI PIN → success; phone + browser both update.
  3. **Gateway checkout** — the store's "Pay with InstaPay" → verified-order approval → receipt.
  4. **Remote kill-switch** — phone → Linked Devices → Terminate → extension logs out **live**.
- Store assets under `docs/` (or `assets/`) and embed them in the README near the relevant section.
- Keep clips short (5–15s), captioned, and cropped to the relevant window.

**Acceptance criteria**
- At least the four flows above are captured and embedded in the README.
- Clips reflect the current build (seeded data, real amounts in INR).

---

## Definition of Done for Phase 5

- [ ] `npm run seed` creates a full demo world and prints all credentials + merchant `keyId`; safe against non-local DBs.
- [ ] Mobile Statistics screen is real, data-backed, styled, with loading/empty/error states.
- [ ] Polish checklist written; happy path + every failure path behave cleanly end to end.
- [ ] Root `README.md` with pitch, security model, architecture + 4 sequence diagrams (mermaid), setup/run, seed path.
- [ ] The four headline flows are recorded and embedded in the README.
- [ ] All projects build/typecheck clean (`backend` tsc, `web-demo` build, `gateway` build, `mobile-app` tsc).

## Explicitly OUT of scope for Phase 5
- New features: webhooks/refunds, multi-account picker, background-service-worker always-on revocation, real merchant auth/signing.
- Real bank/NPCI/RBI integration (this stays a simulation — say so prominently).
- Production hardening beyond what's documented (rate limiting everywhere, secrets management, deploy pipelines).

## Suggested commit sequence
1. `feat(backend): demo seed script (users, accounts, merchant, sample txns)`
2. `feat(mobile): real Statistics screen from transaction history`
3. `polish: loading/empty/error states, config hygiene, consistent naming`
4. `docs: root README with architecture + sequence diagrams`
5. `docs: embed demo GIFs of the four headline flows`
