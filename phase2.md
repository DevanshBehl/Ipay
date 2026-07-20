# Phase 2 — Login-PIN Unlock + Secure Wallet Data: Implementation Prompt

> **How to use this file:** Self-contained work order for an engineer or AI coding agent. Complete tasks in order (backend → extension gate → data wiring). This phase adds the **4-digit login PIN** that guards the browser wallet on every open, verified against the backend with **nothing sensitive stored in `localStorage`**, and replaces the extension's Phase-0 mock data with **real backend data**. Do **not** build `window.upi` injection (Phase 3) or the payment gateway (Phase 4) here.

---

## Context — where the code stands after Phase 1

```
Ipay/
├── backend/    Express 5 + Mongoose + TS. requireAuth (async, session-aware); ws revocation.
├── web-demo/   Chrome MV3 popup. Pairs, auto-resumes, WebSocket instant logout. Wallet still MOCK.
├── mobile-app/ Expo / RN. OTP login, pairing scanner, Linked Devices screen.
└── landingpage/ (out of scope)
```

**Relevant Phase 0/1 facts to build on:**
- `backend/src/models/User.ts` — fields `mobileNumber, email, name, upiId, upiPin (bcrypt hash), qrCodeData, linkedAccounts`; a `pre('save')` hook hashes `upiPin` (guards double-hash via `/^\$2[aby]\$/`); instance method `comparePin(candidate)`.
- `backend/src/middleware/auth.ts` — `requireAuth` (async) sets `req.userId`; if the JWT carries `sessionId` it also requires the `Session` to be `ACTIVE` (so a revoked extension is blocked). Extension tokens carry `sessionId`; mobile tokens do not.
- `backend/src/routes/auth.ts` — `send-otp`, `verify-otp` (public); `setup-profile`, `set-pin`, `user/:id`, `users` (requireAuth). `verify-otp` currently returns the full `user` (incl. the `upiPin` hash) — Phase 2 adds a clean `/auth/me` that excludes both PINs.
- `backend/src/routes/bank.ts` — all under `requireAuth`; `GET /bank/user/:userId` (accounts), `POST /bank/balance` (UPI-PIN gated).
- `backend/src/routes/transaction.ts` — `GET /transaction/history/:upiId`.
- `web-demo/src/App.tsx` — `stage: 'setup' | 'wallet'`; auto-resumes from a stored session; runs a WebSocket + slow poll that call `disconnect()` on revocation.
- `web-demo/src/utils/session.ts` — `saveSession/loadSession/clearSession` (stores only `instapay.sessionToken` + `instapay.jwt`), `createPairing`, `pollStatus`, `sessionSocketUrl`.
- `web-demo/src/utils/api.ts` — axios instance + `setAuthToken`.
- `web-demo/src/data/mock.ts` — INR mock data consumed by `HomeView`, `HistoryView`, `NotificationView`, `StatisticView`, `SendMoneyView`. **This is what Phase 2 replaces with real data.**
- `web-demo/src/components/SendMoneyView.tsx` — contains a working numeric keypad layout to mirror for the PIN pad.

**Two PINs — keep them distinct:**
- **Login PIN** (NEW, this phase) — 4 digits, entered on the extension **every time the wallet opens**, proves the human at the browser is the account owner. Gates *access* to the wallet UI.
- **UPI PIN** (already exists) — authorizes *money movement* (balance reveal, transactions). Unchanged here; used again in Phase 3.

Per `about.md`: neither PIN — nor any confidential detail — is ever stored in `localStorage`; only session data is. Everything else lives on the backend.

---

## Task 1 — Backend: add the login PIN to the User model

Edit `backend/src/models/User.ts`.

1. Add `loginPin?: string` to `IUser` and the schema (will hold a **hash**).
2. Extend the existing `pre('save')` hook to also hash `loginPin` when modified and not already a bcrypt hash (reuse the `isBcryptHash` guard). Keep the `upiPin` logic intact.
3. Add instance method `compareLoginPin(candidate: string): Promise<boolean>` mirroring `comparePin`.

**Acceptance criteria**
- Setting `loginPin` then reading the doc shows a `$2…` hash, never the raw digits.
- Re-saving a user without changing `loginPin` does not re-hash it.
- `upiPin` behaviour is unchanged.

---

## Task 2 — Backend: login-PIN endpoints

Edit `backend/src/routes/auth.ts`. All three are **`requireAuth`** and derive identity from **`req.userId`** (never trust a body `userId`).

| Method | Path | Behaviour |
|--------|------|-----------|
| `GET`  | `/api/auth/me` | Return the caller's user via `req.userId`, projected with `.select('-upiPin -loginPin')`, **plus** a computed `hasLoginPin: boolean`. The extension uses `hasLoginPin` to decide "create" vs "enter". |
| `POST` | `/api/auth/set-login-pin` | Body `{ loginPin }`. Validate it is exactly 4 digits (`/^\d{4}$/`) else `400`. Load `req.userId`, assign `user.loginPin = loginPin` (hook hashes it), save. Return `{ success: true }`. Works for both a first-time set and a change. |
| `POST` | `/api/auth/verify-login-pin` | Body `{ loginPin }`. Load `req.userId`. If `!user.loginPin` → `400 'No login PIN set'`. If `await user.compareLoginPin(loginPin)` → `{ success: true }`, else `401 'Invalid login PIN'`. |

**Recommended hardening (brute-force on a 4-digit space = 10k combos):** track failed attempts and lock briefly after 5 (e.g. add `loginPinAttempts: number` + `loginPinLockedUntil?: Date` to `Session` or `User`; reset on success). If you implement it, `verify-login-pin` returns `429 'Too many attempts, try again in N s'` while locked. Mark clearly if you skip it.

**Acceptance criteria**
- `GET /auth/me` returns the user with **no** PIN fields and a correct `hasLoginPin`.
- `set-login-pin` rejects non-4-digit input and stores a hash.
- `verify-login-pin` returns `200` for the right PIN, `401` for a wrong one, `400` if none set.
- All three reject calls whose session was terminated (inherited from `requireAuth`).

---

## Task 3 — Extension: the login-PIN lock gate

Add a `'locked'` stage between pairing and the wallet. The unlocked state is **in-memory only** — closing/reopening the MV3 popup re-locks (matches `about.md`: "every time you open a wallet you need to enter a login pin").

**3a — `web-demo/src/components/LockScreen.tsx`** (new)
- A numeric PIN pad (mirror the keypad in `SendMoneyView.tsx`) with 4 filled/empty dots.
- On mount, call `GET /auth/me`; read `hasLoginPin`.
  - `hasLoginPin === false` → **Create mode**: prompt for a 4-digit PIN, then a confirm entry; on match call `POST /auth/set-login-pin`, then treat as unlocked → `onUnlock()`.
  - `hasLoginPin === true` → **Enter mode**: on 4 digits, call `POST /auth/verify-login-pin`; success → `onUnlock()`; failure → shake/clear + error text (and show lockout message if the backend returns `429`).
- Provide a subtle "Not you? Disconnect" affordance calling `onDisconnect()` (clears the local session, back to pairing).
- Never write the PIN anywhere except the in-flight request.

**3b — `web-demo/src/App.tsx`**
- Stage machine becomes `'setup' | 'locked' | 'wallet'`.
- Pairing success (`LandingPage.onSetupComplete`) → `'locked'` (not straight to `'wallet'`).
- Resume-on-open: if `loadSession()` returns a session, start at `'locked'` (apply the JWT via `setAuthToken` as today), **not** `'wallet'`.
- `LockScreen.onUnlock` → `'wallet'`.
- **Termination watch must also run while `'locked'`**: change the WebSocket + poll effects' guard from `stage === 'wallet'` to `stage !== 'setup'`, so a phone-side terminate kicks the lock screen back to `'setup'` too.
- `disconnect()` unchanged (clears session, back to `'setup'`).

**Acceptance criteria**
- After pairing, the wallet is **not** reachable until the login PIN is entered/created.
- First-time paired user is asked to **create** a login PIN (with confirm); returning users **enter** it.
- Closing and reopening the popup returns to the lock screen (in-memory unlock, never persisted).
- A wrong PIN never opens the wallet; a terminated session drops the lock screen to pairing.
- `localStorage` still contains only `instapay.sessionToken` + `instapay.jwt` — no PIN, no unlock flag.

---

## Task 4 — Extension: wire the wallet to real backend data

Replace `web-demo/src/data/mock.ts` usage with live data fetched after unlock. Keep the visual design; only the data source changes.

**4a — Data loading**
- After unlock, fetch once and hold in React state (a small `WalletContext` or props from `App`):
  - **Profile** — `GET /auth/me` (name, `upiId`; derive initials/avatar).
  - **Accounts** — `GET /bank/user/:userId` (bank name, masked account number). Use the `userId` from `/auth/me`.
  - **History** — `GET /transaction/history/:upiId` using the profile's `upiId`; map to the `HistoryTxn` shape (positive = the user is the receiver, i.e. `receiverUpiId === myUpiId`).
- Show a lightweight loading state while fetching; show an error/retry state on failure.

**4b — Component updates**
- `HomeView.tsx` — real name/`upiId`; render the linked account(s) instead of the hardcoded VISA/`5466`. **Balance stays UPI-PIN gated:** show a masked balance with a "reveal" action that opens a UPI-PIN modal → `POST /bank/balance { userId, bankAccountId, upiPin }` → show for ~15s (mirror the mobile `HomeScreen` reveal, which auto-hides). Never store the balance or UPI PIN.
- `HistoryView.tsx` — render real transactions (INR via `formatSignedINR`); empty state when none.
- `StatisticView.tsx` — derive simple totals from history (sum received vs sent); if that's out of scope, leave the chart static but **remove** any hardcoded currency figures or clearly label them as placeholder.
- `NotificationView.tsx` — either derive from recent history or leave as a clearly-labelled placeholder (do not present fake amounts as real).
- Trim `data/mock.ts` to only what remains genuinely mock (e.g. `SendMoneyView` inputs, which are non-functional until Phase 3/4).

**Acceptance criteria**
- The wallet shows the **same** name, UPI ID, linked accounts, and transaction history as the paired mobile account.
- Balance is hidden until the correct UPI PIN is entered, then auto-hides; a wrong UPI PIN shows an error and reveals nothing.
- No hardcoded balances/amounts are presented as if real.

---

## Task 5 (optional but recommended) — Mobile: manage the login PIN from the trusted device

So the owner can set/rotate the login PIN from the phone (not only create-on-first-use in the browser).

- Add a **"Login PIN"** row in the Home sidebar **Security** section (next to "Linked Devices" from Phase 1).
- Route to a small `SetLoginPinScreen` (or reuse a PIN modal) → `POST /auth/set-login-pin` with the mobile JWT.
- Copy the app's dark style (see `LinkedDevicesScreen`, `ScanScreen`).

**Acceptance criteria**
- Setting/changing the login PIN on the phone is immediately reflected in the extension's next unlock.

---

## Task 6 — Security audit (report.md's second Phase-2 bullet)

- Grep the extension for any storage of PINs or an "unlocked" flag: `localStorage`, `sessionStorage`, `chrome.storage`. The **only** persisted keys must be `instapay.sessionToken` and `instapay.jwt`.
- Confirm `/auth/me`, `/auth/users`, `/auth/user/:id` never return `upiPin`/`loginPin`. (Consider also stripping the PIN hashes from the `verify-otp` response for consistency.)
- Confirm the unlocked state lives only in React memory and does not survive a popup reopen.

**Acceptance criteria**
- A written note (in the PR/commit) listing exactly what is in web storage and confirming no PIN/secret is among it.

---

## Definition of Done for Phase 2

- [ ] `User` has a hashed `loginPin` with `compareLoginPin`; `pre('save')` hashes it.
- [ ] `/auth/me`, `/auth/set-login-pin`, `/auth/verify-login-pin` exist, are `requireAuth`, use `req.userId`, and never leak PIN hashes.
- [ ] The extension gates the wallet behind a login-PIN `LockScreen` on every open (create-on-first-use, enter thereafter); unlock is in-memory only.
- [ ] Termination watch covers the locked stage.
- [ ] The wallet displays real profile, accounts, and history; balance is UPI-PIN gated and auto-hides.
- [ ] `localStorage` holds only session token + JWT; audit note written.
- [ ] Backend `tsc` clean; `web-demo` build clean; mobile `tsc` clean (if Task 5 done).

## End-to-end test script (manual)
1. Backend up; mobile logged in; extension paired (Phase 1 flow).
2. Extension shows **Create login PIN** on first pair → set + confirm → wallet opens.
3. Wallet shows the **real** name, UPI ID, accounts, and history from the mobile account.
4. Tap reveal balance → enter UPI PIN → balance shows, then auto-hides; wrong UPI PIN → error.
5. Close and reopen the popup → **Enter login PIN** screen; correct PIN → wallet; wrong PIN → rejected.
6. Terminate from the phone while on the lock screen → extension drops to the pairing QR.
7. (Task 5) Change the login PIN on the phone → next extension unlock requires the new PIN.

## Explicitly OUT of scope for Phase 2
- `window.upi` injection, content script, background service worker (Phase 3).
- Transaction-approval pop-up / signing from the browser (Phase 3).
- Payment gateway / merchant checkout (Phase 4).
- Making `SendMoneyView` actually move money (Phase 3/4).

## Suggested commit sequence
1. `feat(backend): add hashed loginPin to User model`
2. `feat(backend): /auth/me + set/verify-login-pin endpoints`
3. `feat(web-demo): login-PIN LockScreen gating the wallet`
4. `feat(web-demo): wire wallet to real profile/accounts/history + UPI-PIN balance reveal`
5. `feat(mobile): manage login PIN from Security settings` (optional)
6. `chore(web-demo): storage audit — only session token + JWT persisted`
