# Phase 0 — Foundation Cleanup: Implementation Prompt

> **How to use this file:** This is a self-contained work order for an engineer or AI coding agent. Complete the tasks in order (they have dependencies). Do **not** start Phase 1 (session pairing) work here — Phase 0 only hardens the existing foundation and prepares the `Session` model that Phase 1 will consume. Every task lists concrete files, exact changes, and acceptance criteria.

---

## Context

InstaPay/iPay is a simulated browser-native UPI wallet prototype. The repo has four parts:

```
Ipay/
├── backend/       Express 5 + Mongoose (MongoDB) + TypeScript   ← working, but insecure
├── mobile-app/    Expo / React Native (TypeScript)              ← working, wired to backend
├── web-demo/      Chrome MV3 extension (React 19 + Vite + Tailwind) ← UI shell, fully mocked
└── landingpage/   Marketing site                                ← out of scope for Phase 0
```

**Backend today** exposes `/api/auth`, `/api/bank`, `/api/transaction`. Key files:
- `backend/src/server.ts` — app bootstrap, `PORT` defaults to `5000`, `MONGO_URI` defaults to `mongodb://127.0.0.1:27017/ipay_simulation`.
- `backend/src/models/User.ts` — `mobileNumber`, `email`, `name`, `upiId`, `upiPin` (plaintext), `qrCodeData`, `linkedAccounts[]`.
- `backend/src/models/BankAccount.ts`, `backend/src/models/Transaction.ts`.
- `backend/src/routes/auth.ts` — OTP via in-memory `Map`, JWT issued but **never verified**, PIN set/stored plaintext.
- `backend/src/routes/bank.ts` — balance endpoint checks `user.upiPin === upiPin` (plaintext compare).
- `backend/src/routes/transaction.ts` — `send` checks plaintext PIN, does debit/credit with manual rollback.

**Known foundation problems Phase 0 must fix:**
1. UPI PINs (and any future login PIN) are stored and compared in **plaintext**.
2. OTPs live in a process-memory `Map` with **no expiry** and are lost on restart.
3. JWTs are issued on OTP verify but **no route enforces them** — every endpoint is open.
4. The extension (`web-demo`) has **no API client**; all data is hardcoded and shown in **USD** (`$50`, `$1000`, `6,342.49`). `axios` is already a dependency but unused.
5. There is **no `Session` model** — Phase 1 needs one.
6. **Port inconsistency:** backend defaults to `5000`; `mobile-app/src/utils/api.ts` points at `http://10.170.86.78:5001/api`. Standardize.

---

## Task 1 — Hash all PINs (bcrypt)

**Goal:** No PIN is ever stored or compared in plaintext.

**Steps**
1. Add dependency in `backend/`: `npm i bcryptjs && npm i -D @types/bcryptjs`. (Use `bcryptjs`, pure-JS, no native build issues.)
2. In `backend/src/models/User.ts`:
   - Keep `upiPin?: string` (it will now hold a **hash**).
   - Add a Mongoose `pre('save')` hook: if `upiPin` is modified **and** not already a bcrypt hash, hash it with `bcrypt.hash(pin, 10)`. (Guard against double-hashing by checking `isModified('upiPin')`.)
   - Add an instance method `comparePin(candidate: string): Promise<boolean>` that returns `bcrypt.compare(candidate, this.upiPin)`.
3. Update every plaintext comparison to use the async method:
   - `backend/src/routes/transaction.ts` — replace `sender.upiPin !== upiPin` with `!(await sender.comparePin(upiPin))` (guard the null/undefined case first).
   - `backend/src/routes/bank.ts` `/balance` — replace `user.upiPin !== upiPin` similarly.
   - `backend/src/routes/auth.ts` `/set-pin` and `/setup-profile` — just assign the raw pin to `user.upiPin`; the pre-save hook hashes it. Do **not** hash manually there (avoids double hashing).
4. **Migration note:** existing DB users have plaintext PINs. Since this is a throwaway simulation DB, document that testers must re-run `/set-pin` (or drop the DB). Do not build a migration script.

**Acceptance criteria**
- Setting a PIN then reading the user in Mongo shows a `$2a$`/`$2b$`-prefixed hash, not the raw digits.
- A correct PIN passes transaction/balance checks; a wrong PIN returns `401`.
- Re-saving a user without changing the PIN does not re-hash it (login/transaction still works after an unrelated `user.save()`).

---

## Task 2 — OTP expiry / TTL

**Goal:** OTPs expire and survive the "no expiry, lost on restart" weakness gracefully.

**Steps (pick ONE approach — A preferred)**

**Approach A — Mongo TTL collection (persistent, survives restart):**
1. Create `backend/src/models/Otp.ts`: fields `mobileNumber` (indexed), `email`, `codeHash` (hash the OTP with bcrypt — do not store raw), `expiresAt: Date`. Add a TTL index: `OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })`.
2. In `auth.ts` `/send-otp`: upsert an `Otp` doc for the mobile number with `expiresAt = now + 5 min` (delete any prior OTP for that number first).
3. In `auth.ts` `/verify-otp`: look up the `Otp` by `mobileNumber`, reject if missing/expired, `bcrypt.compare` the submitted code, then delete the doc on success. Remove the in-memory `otps` `Map`.

**Approach B — in-memory with timestamp (simpler, non-persistent):** store `{ code, expiresAt }` in the `Map`, reject when `Date.now() > expiresAt`, and sweep on read. Acceptable only if you explicitly note it does not survive restarts and is single-instance only.

**Acceptance criteria**
- An OTP older than 5 minutes returns `400 Invalid or expired OTP`.
- A used OTP cannot be reused.
- (Approach A) OTP is not stored in plaintext anywhere; the doc auto-disappears from Mongo after expiry.
- The `console.log("OTP for ... is ...")` dev line may remain (dev-only), but note it must be removed before any real deployment.

---

## Task 3 — Enforce JWT on protected routes

**Goal:** Only authenticated callers can hit user/bank/transaction endpoints.

**Steps**
1. Create `backend/src/middleware/auth.ts`:
   - Export `requireAuth(req, res, next)` that reads `Authorization: Bearer <token>`, verifies it with `jwt.verify(token, process.env.JWT_SECRET || 'secret')`, attaches `req.userId = payload.userId`, and returns `401` on missing/invalid token.
   - Add a typed augmentation (or use `(req as any).userId`) so TypeScript is happy.
2. **Public routes (no middleware):** `POST /api/auth/send-otp`, `POST /api/auth/verify-otp`. These must stay open — they mint the token.
3. **Protected routes (apply `requireAuth`):** everything else — `setup-profile`, `set-pin`, `user/:id`, `users`, all of `/api/bank/*`, all of `/api/transaction/*`.
4. **Ownership hardening:** where a route takes a `userId`/`senderUserId` in the body or params, assert it matches `req.userId` (return `403` on mismatch). This closes the "any user can move another user's money" hole. Do this at least for `transaction/send`, `bank/balance`, `set-pin`, `setup-profile`.
5. **Mobile app wiring:** `mobile-app/src/utils/api.ts` already has `setAuthToken`. Confirm the app calls it after `/verify-otp` and that the token is persisted (e.g. AsyncStorage) and re-applied on app launch. If it is not persisted, add that — otherwise enforcing JWT will break the mobile flow on relaunch.

**Acceptance criteria**
- A request to any protected route without a valid `Authorization` header returns `401`.
- With a valid token from `/verify-otp`, the full mobile flow (profile → link bank → pay → history) works end to end.
- User A's token cannot initiate a transaction or read a balance for User B (`403`).

---

## Task 4 — Standardize backend port & base URL config

**Goal:** One source of truth for the port; no hardcoded mismatches.

**Steps**
1. Decide the canonical port. `mobile-app` currently expects **5001** — either set backend `PORT=5001` (via `.env`) or change the mobile URL. Recommend standardizing on **5001** and documenting it.
2. Add `backend/.env.example` documenting: `PORT`, `MONGO_URI`, `JWT_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `SMTP_EMAIL`, `SMTP_PASSWORD`. Ensure real `.env` is git-ignored (verify `.gitignore`).
3. Note in the README that the mobile app's `BASE_URL` host (`10.170.86.78`) must be the dev machine's LAN IP and will differ per environment. Consider reading it from an Expo env/config rather than hardcoding.

**Acceptance criteria**
- Backend boots on the agreed port; mobile app connects without a manual code edit beyond the LAN IP.
- No secret values are committed; `.env.example` lists every required key.

---

## Task 5 — Give the extension a real API client + INR data

**Goal:** Replace hardcoded USD mock data in `web-demo` with a typed API client and INR formatting, so Phase 1/2 can plug in real data. **Do not** build session pairing or login-PIN logic here — just the client scaffold and currency/format cleanup.

**Steps**
1. Create `web-demo/src/utils/api.ts` mirroring the mobile client: an `axios` instance with a configurable `BASE_URL` (read from a Vite env var, e.g. `import.meta.env.VITE_API_BASE_URL`, defaulting to `http://localhost:5001/api`), plus a `setAuthToken` helper. Add `web-demo/.env.example` with `VITE_API_BASE_URL`.
2. Create `web-demo/src/utils/format.ts` with an INR formatter, e.g. `new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`. Replace **all** `$`-prefixed and `en-US`/dollar amounts across the components:
   - `web-demo/src/components/SendMoneyView.tsx` — `amount = '6,342.49'`, `quickAmounts = ['$50', ...]`.
   - `HomeView.tsx`, `StatisticView.tsx`, `HistoryView.tsx`, `NotificationView.tsx`, `MenuView.tsx` — audit each for hardcoded USD/`$` strings and swap to INR (`₹`).
3. Centralize the currently-hardcoded balance/contacts/history into a single `web-demo/src/data/mock.ts` module (still mock for now, but INR and in one place), and have components import from it. This makes the Phase 1/2 swap from mock → API a one-file change.
4. **Duplicate-code cleanup:** `web-demo/InstaPay/` contains stale copies of `BottomNav.tsx`, `HomeView.tsx`, `LandingPage.tsx`, `SendMoneyView.tsx`, `StatisticView.tsx` that duplicate `web-demo/src/components/`. Confirm they are unused (not imported anywhere) and delete the `web-demo/InstaPay/` folder. If any are referenced, consolidate first.
5. Do **not** wire real endpoints yet if they require auth the extension can't obtain until Phase 2 — it's fine for the client to exist and be unused until then. The deliverable is: client scaffold present, INR everywhere, mock data centralized, dead code removed.

**Acceptance criteria**
- No `$` currency symbols or `en-US` currency formatting remain in `web-demo/src`.
- All displayed amounts render as INR (`₹`).
- `web-demo/InstaPay/` is gone (or its contents proven live and merged).
- `web-demo/src/utils/api.ts` exists, builds, and is importable; `.env.example` documents the base URL.

---

## Task 6 — Add the `Session` model (foundation for Phase 1)

**Goal:** Introduce the schema Phase 1 (pairing) and the mobile "Active Sessions" screen will use. **No endpoints or business logic in Phase 0** — just the model and its indexes, so the shape is settled early.

**Steps**
1. Create `backend/src/models/Session.ts` with fields:
   - `userId: ObjectId` (ref `User`, indexed, required)
   - `sessionToken: string` (unique, indexed — the value the extension stores locally)
   - `deviceLabel: string` (e.g. "Chrome on macOS")
   - `status: 'PENDING' | 'ACTIVE' | 'TERMINATED'` (enum, default `'PENDING'`)
   - `pairingCode?: string` (short-lived code embedded in the pairing QR)
   - `pairingExpiresAt?: Date`
   - `lastActiveAt: Date`
   - `{ timestamps: true }`
2. Add a TTL index on `pairingExpiresAt` scoped so it only expires still-`PENDING` sessions (or handle expiry in Phase 1 logic — document the choice). Do not auto-delete `ACTIVE`/`TERMINATED` sessions.
3. Export the model and its `ISession` interface, matching the style of the other models. Do **not** register any routes for it yet.

**Acceptance criteria**
- `backend/src/models/Session.ts` compiles and the model can be imported.
- No new routes reference it (Phase 1 will).
- Field names/enum values are documented so Phase 1 can build against them without renames.

---

## Definition of Done for Phase 0

- [ ] PINs are bcrypt-hashed; no plaintext PIN comparison remains anywhere.
- [ ] OTPs expire (≤5 min), are single-use, and are not stored in plaintext.
- [ ] `requireAuth` middleware protects all non-OTP routes; ownership checks prevent cross-user actions; mobile app persists & re-applies its token.
- [ ] Backend port is standardized and `.env.example` documents all config; no secrets committed.
- [ ] `web-demo` has an axios API client + INR formatting; all mock data is INR and centralized; `web-demo/InstaPay/` dead code removed.
- [ ] `Session` model exists with agreed fields/indexes (no endpoints yet).
- [ ] The existing mobile → backend flow (OTP login → profile → link bank → pay by UPI → scan-to-pay → history) still works end to end after all changes.

## Explicitly OUT of scope for Phase 0
- QR **session pairing** handshake, pairing endpoints, mobile scanner changes (Phase 1).
- Extension **login-PIN** gate and real authenticated data in the wallet (Phase 2).
- `window.upi` **injection**, content script, background worker (Phase 3).
- The **payment gateway** project (Phase 4).

## Suggested commit sequence
1. `chore(backend): hash UPI PINs with bcrypt`
2. `feat(backend): persistent OTP with TTL expiry`
3. `feat(backend): enforce JWT auth + ownership checks on protected routes`
4. `chore: standardize dev port and add .env.example files`
5. `refactor(web-demo): add api client, INR formatting, centralize mock data, remove dead InstaPay dir`
6. `feat(backend): add Session model for upcoming pairing flow`
