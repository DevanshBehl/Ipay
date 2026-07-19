# Phase 1 — Session Pairing (the "WhatsApp Web moment"): Implementation Prompt

> **How to use this file:** Self-contained work order for an engineer or AI coding agent. Complete tasks in order — they have hard dependencies (backend endpoints must exist before the extension/mobile can call them). This phase builds the **cross-device pairing handshake** that lets the browser extension become a real, user-owned session that the mobile app can approve and remotely revoke. Do **not** build `window.upi` injection (Phase 3), the extension login-PIN gate (Phase 2), or the payment gateway (Phase 4) here.

---

## Context — where the code stands after Phase 0

```
Ipay/
├── backend/       Express 5 + Mongoose + TS. requireAuth enforced; PINs hashed; OTP TTL.
├── mobile-app/    Expo / React Native. OTP login → token set in-session via setAuthToken.
├── web-demo/      Chrome MV3 popup. Has utils/api.ts (axios + setAuthToken) but no pairing yet.
└── landingpage/   Marketing site (out of scope).
```

**Phase 0 already delivered the foundation Phase 1 consumes:**
- `backend/src/models/Session.ts` exists with fields: `userId`, `sessionToken` (unique), `deviceLabel`, `status: 'PENDING' | 'ACTIVE' | 'TERMINATED'`, `pairingCode?`, `pairingExpiresAt?`, `lastActiveAt`. **No routes reference it yet — that is this phase's job.**
- `backend/src/middleware/auth.ts` — `requireAuth` attaches `req.userId` from a JWT signed as `jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })`.
- `backend/src/server.ts` mounts `/api/auth` (mixed public/protected), `/api/bank` and `/api/transaction` (blanket `requireAuth`).
- `web-demo/src/utils/api.ts` — axios instance (`VITE_API_BASE_URL`, default `http://localhost:5001/api`) + `setAuthToken`.
- `web-demo/src/App.tsx` — `stage: 'setup' | 'wallet'`; `LandingPage` flips to `'wallet'` via `onSetupComplete()`.
- `web-demo/src/components/LandingPage.tsx` — renders a **static** `QRCodeSVG value="instapay://connect?session=123456789"` and a fake "I've scanned it" button. **This is what Phase 1 makes real.**
- `mobile-app/src/screens/ScanScreen.tsx` — parses only `upi://pay?...` QR codes.
- Backend + mobile are standardized on **port 5001**.

---

## The pairing handshake (target architecture)

```
┌── Browser extension (no user yet) ──┐        ┌────── Backend ──────┐        ┌── Mobile app (logged in) ──┐
│ 1. POST /session/create             │───────▶│ create PENDING       │        │                            │
│    { deviceLabel }                  │◀───────│ Session, return      │        │                            │
│    receives { sessionToken,         │        │ { sessionToken,      │        │                            │
│               pairingCode, expiresAt}│        │   pairingCode }      │        │                            │
│ 2. render QR:                       │        │                      │        │                            │
│    instapay://connect?code=<code>   │        │                      │◀───────│ 3. scan QR → extract code  │
│ 4. poll GET /session/status         │        │                      │        │    POST /session/approve   │
│    (Bearer sessionToken)  ──loop──▶ │        │ approve: set userId, │◀───────│    { pairingCode } (+JWT)  │
│                                     │◀───────│ status=ACTIVE        │───────▶│ 200 "Browser paired"       │
│ 5. status=ACTIVE → receive          │        │ status→ signs a NEW  │        │                            │
│    { token(JWT w/ sessionId), user }│        │ JWT { userId,        │        │ 6. Linked Devices screen:  │
│    store locally, enter wallet      │        │       sessionId }     │◀───────│    GET /session/list       │
│ 7. keep polling; status=TERMINATED  │        │ terminate: status→   │◀───────│    POST /session/terminate │
│    → wipe local, back to QR         │        │ TERMINATED           │        │    { sessionId }           │
└─────────────────────────────────────┘        └──────────────────────┘        └────────────────────────────┘
```

**Two secrets, deliberately separated:**
- `pairingCode` — short, goes **inside the QR** (visible on screen, treated as low-secrecy). Single-use, expires in ~2 min.
- `sessionToken` — long random secret the extension holds to poll `/session/status`. **Never placed in the QR.**

**Termination is real, two ways:** (a) the extension's poll sees `TERMINATED` and wipes itself (the WhatsApp-Web behaviour); (b) the extension's JWT carries a `sessionId`, and `requireAuth` rejects API calls whose session is no longer `ACTIVE` — so a terminated browser can't transact even if it ignores the poll.

---

## Task 1 — Backend: session routes

Create `backend/src/routes/session.ts` and mount it. Use `crypto` for tokens/codes. Reuse the JWT signing pattern from `routes/auth.ts`.

**Token/code generation**
- `sessionToken = crypto.randomBytes(32).toString('hex')`
- `pairingCode = crypto.randomBytes(6).toString('hex')` (12 URL-safe chars)
- `PAIRING_TTL_MS = 2 * 60 * 1000`

**Endpoints**

| Method | Path | Auth | Behaviour |
|--------|------|:----:|-----------|
| `POST` | `/api/session/create` | public | Body `{ deviceLabel }`. Create a `Session` `{ sessionToken, pairingCode, deviceLabel, status: 'PENDING', pairingExpiresAt: now + PAIRING_TTL_MS, lastActiveAt: now }`. Return `{ sessionToken, pairingCode, expiresAt }`. |
| `GET` | `/api/session/status` | sessionToken | Read `sessionToken` from `Authorization: Bearer <sessionToken>` (or `?sessionToken=`). Look up the session. If not found → `404`. If `PENDING` and `pairingExpiresAt < now` → return `{ status: 'EXPIRED' }`. If `PENDING` → `{ status: 'PENDING' }`. If `TERMINATED` → `{ status: 'TERMINATED' }`. If `ACTIVE` → update `lastActiveAt = now`, sign a fresh JWT `jwt.sign({ userId, sessionId }, JWT_SECRET, { expiresIn: '7d' })`, load the user (`.select('-upiPin')`), return `{ status: 'ACTIVE', token, user }`. |
| `POST` | `/api/session/approve` | `requireAuth` | Body `{ pairingCode }`. Find a `PENDING` session by `pairingCode` with `pairingExpiresAt >= now`. If none → `400 'Invalid or expired pairing code'`. Set `userId = req.userId`, `status = 'ACTIVE'`, `lastActiveAt = now`, unset `pairingCode` and `pairingExpiresAt`, save. Return `{ success: true, deviceLabel }`. |
| `GET` | `/api/session/list` | `requireAuth` | Return this user's `ACTIVE` sessions (`{ userId: req.userId, status: 'ACTIVE' }`), newest first, projecting only `_id, deviceLabel, lastActiveAt, createdAt`. **Never** return `sessionToken`. |
| `POST` | `/api/session/terminate` | `requireAuth` | Body `{ sessionId }`. Load session; if missing → `404`; if `session.userId !== req.userId` → `403`. Set `status = 'TERMINATED'`, save. Return `{ success: true }`. |

**Wire-up (`server.ts`)**
- `import sessionRoutes from './routes/session';`
- `app.use('/api/session', sessionRoutes);` — routes guard themselves per-line (mirrors `/api/auth`), so **do not** blanket-`requireAuth` at the mount (create/status must stay public).

**Acceptance criteria**
- `POST /session/create` returns a `sessionToken`, `pairingCode`, `expiresAt` and persists a `PENDING` doc.
- Polling `/session/status` returns `PENDING`, then `ACTIVE` (with `token`+`user`) after approval, then `TERMINATED` after termination, then `EXPIRED` if never approved within 2 min.
- `/session/approve` with another user's/expired/nonexistent code fails with `400`; a valid one flips the session to `ACTIVE` and stamps `userId`.
- `/session/list` shows only the caller's `ACTIVE` sessions and never leaks `sessionToken`.
- `/session/terminate` on someone else's session → `403`.

---

## Task 2 — Backend: make termination enforceable on protected APIs

**Goal:** A terminated browser session cannot call `/api/bank/*` or `/api/transaction/*` even if it keeps its JWT. Mobile tokens (no `sessionId`) are unaffected.

**Steps**
1. In `backend/src/middleware/auth.ts`, make `requireAuth` **async**. After verifying the JWT and setting `req.userId`:
   - If the payload has a `sessionId`, load that `Session`. If it is missing or `status !== 'ACTIVE'`, return `401 { error: 'Session terminated' }`. Optionally set `req.sessionId` and bump `lastActiveAt`.
   - If the payload has **no** `sessionId` (mobile app tokens), skip the session check entirely — behaviour is unchanged.
2. Confirm all existing `requireAuth` usages still compile with the async signature (Express awaits the returned promise; wrap the body in try/catch and `return` on every branch as today).

**Acceptance criteria**
- An extension JWT (contains `sessionId`) can call `/bank`/`/transaction` while its session is `ACTIVE`.
- After the session is `TERMINATED`, that same JWT returns `401` on any protected route.
- A mobile JWT (no `sessionId`) continues to work exactly as before.

---

## Task 3 — Extension: real pairing, auto-resume, live termination

Work in `web-demo/`. Keep secrets out of the QR; store only session data locally (matches the project's "nothing but session details in local storage" rule).

**3a — Session helper (`web-demo/src/utils/session.ts`)**
- `getDeviceLabel()` → derive a friendly label from `navigator.userAgent` (e.g. `"Chrome on macOS"`). Keep it simple and defensive.
- Local storage keys (via `localStorage`; note MV3 could use `chrome.storage.local` with the `storage` permission — `localStorage` is acceptable for this prototype): `instapay.sessionToken`, `instapay.jwt`.
- `saveSession({ sessionToken, jwt })`, `loadSession()`, `clearSession()`.
- `createPairing()` → `POST /session/create` with `{ deviceLabel }`, returns `{ sessionToken, pairingCode, expiresAt }`.
- `pollStatus(sessionToken)` → `GET /session/status` with `Authorization: Bearer <sessionToken>`, returns the status payload.

**3b — `LandingPage.tsx` (replace the mock)**
- On mount of the QR view, call `createPairing()`; render a **real** QR: `QRCodeSVG value={`instapay://connect?code=${pairingCode}`}`.
- Poll `pollStatus(sessionToken)` every ~2.5s (via `setInterval`, cleaned up on unmount):
  - `ACTIVE` → `saveSession({ sessionToken, jwt: token })`, call `setAuthToken(token)`, then `onSetupComplete()`.
  - `EXPIRED` → transparently call `createPairing()` again and refresh the QR (optionally show a subtle "code refreshed" state).
  - `PENDING` → keep waiting; optionally show a countdown from `expiresAt`.
- Remove the fake "I've scanned it" button (advancement is now driven by the poll). Keep the "Back" affordance.

**3c — `App.tsx` (auto-resume + termination watch)**
- On first render, `loadSession()`. If a `jwt` + `sessionToken` exist, `setAuthToken(jwt)` and start in `stage: 'wallet'` (skip pairing).
- While in `'wallet'`, poll `pollStatus(sessionToken)` on an interval (e.g. every ~10s). If status is `TERMINATED`/`EXPIRED`/`404` → `clearSession()`, `setAuthToken(null)`, and drop back to `stage: 'setup'` (which shows a fresh pairing QR).
- `MenuView`'s `onDisconnect` → `clearSession()` + `setAuthToken(null)` + back to `'setup'` (a local logout; server-side revocation is the phone's job in this phase).

**Constraint to document:** an MV3 popup only runs while open, so the in-wallet termination poll fires when the user opens the popup, not continuously in the background. That is acceptable for Phase 1; a background service worker for always-on revocation can come later.

**Acceptance criteria**
- Opening the extension with no stored session shows a live QR backed by a real `PENDING` session.
- Scanning + approving on the phone auto-advances the extension into the wallet **without** clicking anything, and a JWT is stored.
- Re-opening the extension resumes straight into the wallet (no re-pair).
- Terminating from the phone, then reopening the extension, kicks it back to a fresh pairing QR.
- The `sessionToken` never appears inside the QR value.

---

## Task 4 — Mobile: recognize & approve the pairing QR

Edit `mobile-app/src/screens/ScanScreen.tsx` (`handleBarcodeScanned`).

**Steps**
1. Branch on the scanned scheme:
   - `data.startsWith('upi://pay')` → existing pay flow (unchanged).
   - `data.startsWith('instapay://connect')` → parse `code` from the query string, then `POST /session/approve { pairingCode: code }` (the logged-in user's token is already on the axios instance via `setAuthToken`).
   - Otherwise → the existing "Invalid QR" alert.
2. On approve success → `Alert.alert('Browser Linked', 'You have paired a browser wallet.')` and `navigation.goBack()`. On failure → show the server error and allow "Scan Again" (reset `scanned`).
3. No new permissions or screens needed here — reuse the existing camera scanner reached from Home.

**Acceptance criteria**
- Scanning the extension's QR from the mobile app links the browser (extension advances within seconds).
- Scanning a normal `upi://pay` QR still routes to `PayUpi` exactly as before.
- An expired/invalid pairing code surfaces the backend error and lets the user retry.

---

## Task 5 — Mobile: "Linked Devices" screen (view + terminate)

**Steps**
1. Create `mobile-app/src/screens/LinkedDevicesScreen.tsx`:
   - On focus, `GET /session/list`; render each session's `deviceLabel` + a relative `lastActiveAt` ("Active 2 min ago").
   - Each row has a **Terminate** button → `POST /session/terminate { sessionId }` → on success, refetch/optimistically remove the row.
   - Empty state: "No browsers are currently linked."
   - Match the app's existing dark visual style (see `ScanScreen`/`HomeScreen` for palette: `#000000` bg, white text, rounded cards).
2. Register the route in `mobile-app/App.tsx`:
   - Add `LinkedDevices: undefined;` to `RootStackParamList` and a `<Stack.Screen name="LinkedDevices" component={LinkedDevicesScreen} />`.
3. Add an entry point: a "Linked Devices" / "Paired Browsers" button — either in the Home header (`HomeScreen.tsx`) or a profile/menu area — that navigates to `LinkedDevices`.

**Acceptance criteria**
- The screen lists exactly the current user's `ACTIVE` browser sessions.
- Tapping **Terminate** removes the row and (per Task 2/3) the corresponding extension is logged out on its next poll and blocked from protected APIs immediately.
- The screen is reachable from normal in-app navigation.

---

## Definition of Done for Phase 1

- [ ] `session.ts` routes exist and are mounted; create/status are public, approve/list/terminate are `requireAuth`.
- [ ] `requireAuth` enforces `ACTIVE` session status for tokens carrying a `sessionId`; mobile tokens are unaffected.
- [ ] Extension shows a **real** QR from a live `PENDING` session, auto-advances on approval, stores its JWT, and auto-resumes on reopen.
- [ ] Extension detects `TERMINATED`/`EXPIRED` and returns to the pairing QR; `MenuView` disconnect clears local session.
- [ ] Mobile scanner approves `instapay://connect` codes while leaving `upi://pay` untouched.
- [ ] Mobile "Linked Devices" screen lists and terminates sessions and is reachable from the UI.
- [ ] Full end-to-end demo works: **open extension → scan on phone → wallet unlocks → terminate on phone → extension logs out.**

## End-to-end test script (manual)
1. Start backend (`:5001`) and both clients pointing at it.
2. Log into the mobile app (OTP).
3. Open the extension → a QR appears.
4. Mobile → Scan → point at the QR → "Browser Linked"; extension jumps to the wallet.
5. Reload the extension → it resumes into the wallet directly.
6. Mobile → Linked Devices → the browser is listed → Terminate.
7. Reopen the extension → it is back at the pairing QR; any protected API call it attempts returns `401`.

## Explicitly OUT of scope for Phase 1
- `window.upi` injection, content script, background service worker (Phase 3).
- The extension **login-PIN** unlock gate and fetching real balances/history into the wallet (Phase 2 — the wallet may keep Phase-0 mock data for now).
- Payment gateway and transaction-approval pop-up (Phase 4).
- Rate-limiting `/session/create`, background/always-on revocation polling (later hardening).

## Suggested commit sequence
1. `feat(backend): session pairing routes (create/status/approve/list/terminate)`
2. `feat(backend): enforce ACTIVE session in requireAuth for sessionId tokens`
3. `feat(web-demo): real QR pairing, auto-resume, and termination watch`
4. `feat(mobile): approve instapay://connect pairing QR in scanner`
5. `feat(mobile): Linked Devices screen to view and terminate sessions`
