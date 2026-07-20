# Phase 3 — `window.upi` Provider Injection + In-Wallet Approval: Implementation Prompt

> **How to use this file:** Self-contained work order for an engineer or AI coding agent. This is the **hardest and most defining** phase — it turns the extension from a standalone popup into a **Phantom/MetaMask-style provider** that any web page can detect and connect to. A page calls `window.upi.connect()` / `window.upi.request({ method: 'upi_pay', ... })`; the extension shows an **approval popup that requires the UPI PIN**, executes the (simulated) transaction on the backend, and returns an acknowledgement to the page. Do **not** build the merchant/checkout gateway or its SDK here — that's Phase 4. Phase 3 ships a throwaway test page only.

---

## Context — where the code stands after Phase 2

```
Ipay/
├── backend/    Express 5 + Mongoose + TS. requireAuth (async, session-aware); ws revocation.
│               POST /transaction/send { senderUserId, senderBankAccountId, receiverUpiId, amount, upiPin }
│               (enforces senderUserId === req.userId). GET /bank/user/:userId. GET /auth/me.
├── web-demo/   Chrome MV3 popup (Vite + React 19 + Tailwind). Pairs, login-PIN unlock, real wallet data,
│               instant ws revocation. **Popup-only today: no content script, no background, no window.upi.**
├── mobile-app/ Expo / RN. Login, pairing scanner, Linked Devices, Login-PIN settings.
└── landingpage/ (out of scope)
```

**Key facts to build on:**
- `web-demo/public/manifest.json` — MV3, **`action.default_popup: index.html` only**. No `content_scripts`, no `background`, no `permissions`.
- `web-demo/vite.config.ts` — plain single-entry Vite (`base: './'`, react + tailwind). Phase 3 needs a **multi-entry** build (popup + content script + injected provider + background service worker).
- `web-demo/src/utils/session.ts` — `loadSession()` returns `{ sessionToken, jwt }` from `localStorage` (keys `instapay.sessionToken`, `instapay.jwt`). **All extension pages share the same `chrome-extension://<id>` origin and therefore share this `localStorage`.**
- `web-demo/src/utils/api.ts` — axios instance + `setAuthToken`.
- `web-demo/src/utils/wallet.ts` — `getAccounts(userId)`, `revealBalance(...)`. Phase 3 adds `sendPayment(...)`.
- `web-demo/src/App.tsx` — stage machine `'setup' | 'locked' | 'wallet'`. Phase 3 makes it **also** render an approval flow when opened as an approval window.
- Backend `POST /transaction/send` already does everything an approval needs (PIN check, balance, transfer, session enforcement). **Phase 3 reuses it — no new backend endpoint required.** (Phase 4 adds the dedicated gateway endpoint.)

---

## Target architecture (the four contexts + backend)

```
   PAGE (untrusted, e.g. a merchant site)
   ┌─────────────────────────────────────────┐
   │  window.upi  (MAIN-world provider)       │  ← Task 1
   │  connect() / request() / on()            │
   └───────────────▲───────────┬──────────────┘
        window.postMessage (namespaced, nonce-checked)   ← Task 1↔2 bridge
   ┌───────────────┴───────────▼──────────────┐
   │  content-bridge (ISOLATED world)          │  ← Task 2
   │  relays page ⇄ background                  │
   └───────────────▲───────────┬──────────────┘
        chrome.runtime Port (long-lived, keeps SW alive)
   ┌───────────────┴───────────▼──────────────┐
   │  background service worker                │  ← Task 3
   │  pending-request registry + window mgr    │
   │  chrome.windows.create(approval popup)    │
   └───────────────▲───────────┬──────────────┘
        chrome.runtime messages + rid in URL
   ┌───────────────┴───────────▼──────────────┐
   │  Approval window = index.html#/approve    │  ← Task 4
   │  (extension page, shares localStorage/JWT)│
   │  reads session → shows tx → UPI PIN →      │
   │  POST /transaction/send → returns ack      │
   └───────────────────────────┬──────────────┘
                               ▼
                         BACKEND (existing)
```

**Why each piece:**
- **MAIN world** provider (`window.upi`) — visible to page scripts; **cannot** use `chrome.*`. Talks to the bridge via `postMessage`.
- **ISOLATED** content bridge — has `chrome.runtime`; relays messages. Injecting the provider is done with a `world: "MAIN"` content script (Chrome 111+) — no `web_accessible_resources` script tag needed.
- **Background SW** — the only context that can open windows and route between tabs. MV3 SWs are **ephemeral**: keep it alive for the life of a request by using a long-lived `chrome.runtime.connect` **Port** from the bridge and from the approval window (an open port prevents SW shutdown). Store pending requests in memory keyed by a random `rid`; also mirror to `chrome.storage.session` so a killed SW can recover.
- **Approval window** — a real extension page (`index.html` with a hash route), so it **shares `localStorage`** and thus the session JWT. This is where the backend call and UPI-PIN entry happen. The background never sees the JWT or PIN.

**Security invariants (enforce all):**
1. The page/provider **never** receives the JWT, sessionToken, UPI PIN, or balance — only `{ upiId, name }` on connect and `{ status, txnId }` on pay.
2. Every `postMessage` is namespaced (`__instapay`) and carries a per-load random `nonce`; the bridge ignores messages with the wrong nonce or `event.source !== window`.
3. The **requesting origin** is captured by the bridge (not trusted from the page) and shown in every approval; it is included in emitted events.
4. Money movement always requires the **UPI PIN** entered in the approval window and is executed by the backend (which re-checks the PIN, balance, and session). A terminated session ⇒ `/transaction/send` returns 401 ⇒ approval fails.
5. Treat all page-supplied params (`amount`, `payeeUpiId`, `note`) as untrusted; validate/normalize in the approval UI before showing.

---

## Task 0 — Build tooling & manifest (multi-entry MV3)

The current single-entry Vite build can't produce a content script + background + provider. Choose one:

**Option A (recommended): `@crxjs/vite-plugin`.** It reads the manifest, bundles `content_scripts`/`background`/`web_accessible_resources`, supports `world: "MAIN"`, and wires HMR. Add it and point it at `manifest.json`.

**Option B (manual): multi-entry Rollup input** in `vite.config.ts` (`build.rollupOptions.input` = `{ popup: index.html, background: src/background.ts, bridge: src/content/bridge.ts, provider: src/content/provider.ts }`) with `output.entryFileNames` fixed (no hashes, so the manifest can reference stable paths), and a **hand-written `manifest.json`**. More control, more boilerplate.

Update `web-demo/public/manifest.json` (or the CRXJS source manifest) to add:
```jsonc
{
  "manifest_version": 3,
  "action": { "default_popup": "index.html", ... },        // unchanged
  "background": { "service_worker": "background.js", "type": "module" },
  "content_scripts": [
    { "matches": ["http://*/*", "https://*/*"],
      "js": ["provider.js"], "run_at": "document_start", "world": "MAIN" },
    { "matches": ["http://*/*", "https://*/*"],
      "js": ["bridge.js"], "run_at": "document_start", "world": "ISOLATED" }
  ],
  "permissions": ["storage"],
  "web_accessible_resources": [
    { "resources": ["index.html", "assets/*"], "matches": ["<all_urls>"] }
  ]
}
```
- `run_at: document_start` so `window.upi` exists before page scripts run.
- `world: "MAIN"` requires Chrome 111+ — state this as the min supported version.

**Acceptance criteria**
- `npm run build` produces `dist/` containing `index.html`, `background.js`, `provider.js`, `bridge.js`, and `assets/*`, with a valid `manifest.json`.
- Loading `dist/` unpacked in Chrome shows no manifest errors; the popup still works exactly as in Phase 2.

---

## Task 1 — Injected provider: `window.upi` (MAIN world)

`web-demo/src/content/provider.ts` (bundled to `provider.js`, injected into the MAIN world).

- On load, define a non-enumerable `window.upi`:
  ```ts
  interface UpiProvider {
    isInstaPay: true;
    isConnected: boolean;
    connect(): Promise<{ upiId: string; name?: string }>;
    disconnect(): Promise<void>;
    request(args: { method: 'upi_pay' | 'upi_getAccount'; params?: any }): Promise<any>;
    pay(params: { payeeUpiId: string; amount: number; note?: string; merchantName?: string }): Promise<{ status: string; txnId?: string }>; // convenience = request({method:'upi_pay'})
    on(event: 'connect' | 'disconnect' | 'accountChanged', cb: (payload: any) => void): void;
    removeListener(event: string, cb: (payload: any) => void): void;
  }
  ```
- Implement an internal event emitter and a request/response correlation map: each call generates an `id`, posts `{ __instapay: true, nonce, direction: 'toBridge', id, method, params }` via `window.postMessage`, and returns a Promise resolved/rejected when the matching `{ direction: 'toPage', id, result | error }` arrives.
- `nonce` is a random value created at load; include it on every outgoing message and validate it on incoming.
- Dispatch a `window.dispatchEvent(new Event('upi#initialized'))` after defining the provider (lets pages that loaded first detect late injection).
- Never store or expose secrets; the provider only ever holds the connected `upiId`/`name` and request results.

**Acceptance criteria**
- On any http/https page, `window.upi` exists at `document_start`, `window.upi.isInstaPay === true`.
- `connect()`/`request()` return Promises that settle based on bridge responses.
- Bogus/foreign `postMessage` (wrong nonce, wrong source) is ignored.

---

## Task 2 — Content bridge (ISOLATED world)

`web-demo/src/content/bridge.ts` (bundled to `bridge.js`).

- Open a long-lived port: `const port = chrome.runtime.connect({ name: 'instapay-content' })`.
- Relay **page → background**: listen for `window.postMessage` with `__instapay && direction === 'toBridge' && nonce === <captured>` and `event.source === window`; forward `{ id, method, params, origin: location.origin }` over the port. **Origin is taken from `location.origin`, never from the message.**
- Relay **background → page**: on `port.onMessage` with a result/error for an `id`, post `{ __instapay, nonce, direction: 'toPage', id, result?, error? }` back to `window`.
- Relay **events** (`connect`/`disconnect`) pushed by the background to the page as `{ direction: 'toPage', event, payload }`.
- Capture the provider's `nonce`: the provider posts a one-time `{ __instapay, direction: 'hello', nonce }` at startup that the bridge records (and the bridge replies so the provider knows the bridge is present). Reject page messages whose nonce doesn't match.

**Acceptance criteria**
- Messages round-trip page ⇄ background with correct `id` correlation.
- The origin forwarded to the background equals the real page origin.

---

## Task 3 — Background service worker (router + window manager)

`web-demo/src/background.ts` (bundled to `background.js`, `type: module`).

- Maintain `pending: Map<rid, { tabId, portRef, method, params, origin, resolve/relay }>`; mirror to `chrome.storage.session` for SW-restart resilience.
- On a content port message:
  - `upi_getAccount` — no UI: read nothing sensitive here; instead open a **silent check**: query the approval page? Simpler — treat `upi_getAccount` like `connect` but non-interactive: reply from `chrome.storage.session` cached account if the page is already connected this session; otherwise require `connect()` first (reject with `not_connected`).
  - `connect` — create `rid`, stash the pending request, and open the approval window at `index.html#/connect?rid=<rid>&origin=<encoded>`.
  - `upi_pay` — validate params minimally (`payeeUpiId` non-empty, `amount > 0`); create `rid`; open `index.html#/approve?rid=<rid>`.
- Open the approval UI as a small popup window:
  ```ts
  chrome.windows.create({ url, type: 'popup', width: 380, height: 620, focused: true });
  ```
- Accept the approval window's result message `{ rid, approved, account? , txn? , error? }`, look up the pending request, and **relay** the result back over the originating content port (so it reaches the right tab). Remove the pending entry and (optionally) close the approval window.
- Keep-alive: the open content port and the approval window's own port keep the SW alive for the request's duration. Add a safety **timeout** (e.g. 3 min) that rejects a pending request with `timeout` if the window is closed without a decision (listen to `chrome.windows.onRemoved`).
- Track connected origins per session in `chrome.storage.session` so `disconnect()`/session-terminate can clear them and emit `disconnect` to the page.

**Acceptance criteria**
- Exactly one approval window opens per request; closing it without deciding rejects the page Promise with a `user_rejected`/`timeout` error.
- Results are routed back to the correct tab even with multiple tabs open.
- SW being suspended between messages does not lose an in-flight request (recovered from `chrome.storage.session`).

---

## Task 4 — Approval UI (connect + pay) inside the app

Make `web-demo/src/App.tsx` branch on the URL: if `location.hash` starts with `#/approve` or `#/connect`, render an **`<ApprovalFlow>`** instead of the normal wallet stage machine. Add `web-demo/src/components/ApprovalFlow.tsx` (+ small subviews).

Shared setup (both modes):
- On mount, `loadSession()`; if none → show "Wallet not set up — open the InstaPay popup to pair" and a Reject button. If present → `setAuthToken(jwt)`.
- Read `rid`/`origin` from the URL; fetch the full request from the background (`chrome.runtime.sendMessage({ type: 'getRequest', rid })`).
- Render the requesting **origin** prominently (anti-phishing).

**Connect mode** (`#/connect`):
- Fetch `/auth/me` → show `{ name, upiId }` and "Allow **<origin>** to see your UPI ID?" with **Connect / Reject**.
- On Connect → reply to background `{ rid, approved: true, account: { upiId, name } }`; background caches the connected origin and resolves the page.
- No PIN required for connect (mirrors Phantom: connect reveals identity only).

**Pay mode** (`#/approve`):
- Show amount (formatted INR), payee UPI id, note, merchant/origin, and which linked account will be debited (`getAccounts(me._id)[0]`).
- Require the **UPI PIN** (reuse the PIN entry pattern from `HomeView`'s balance modal / `LockScreen`).
- On Approve → call `sendPayment(...)` (Task 5) → on success reply `{ rid, approved: true, txn: { status, txnId } }`; on failure show the backend error inline and let the user retry or reject.
- On Reject/close → reply `{ rid, approved: false, error: 'user_rejected' }`.

**Acceptance criteria**
- The approval window shows real account/identity data and the true requesting origin.
- Pay requires a correct UPI PIN; a wrong PIN shows an error and does not move money.
- Approve executes a **real** backend transfer and returns a `txnId` to the page; the mobile app's history reflects it.

---

## Task 5 — Payment execution helper (reuse existing backend)

Add to `web-demo/src/utils/wallet.ts`:
```ts
export async function sendPayment(args: {
  senderUserId: string; senderBankAccountId: string; receiverUpiId: string; amount: number; upiPin: string;
}): Promise<{ status: string; txnId?: string }> {
  const { data } = await api.post('/transaction/send', {
    senderUserId: args.senderUserId,
    senderBankAccountId: args.senderBankAccountId,
    receiverUpiId: args.receiverUpiId,
    amount: args.amount,
    upiPin: args.upiPin,
  });
  return { status: data.transaction?.status || 'SUCCESS', txnId: data.transaction?._id };
}
```
- `senderUserId` from `/auth/me`; `senderBankAccountId` = the user's primary linked account (`getAccounts(userId)[0]._id`).
- **No backend change required** — `/transaction/send` already enforces `senderUserId === req.userId`, the UPI PIN, balance, and (via the session-scoped JWT) an active session. Confirm the extension JWT still carries `sessionId` so a revoked wallet's payment is blocked with 401.

**Acceptance criteria**
- A successful approval creates a `Transaction` (SUCCESS) and decrements/increments balances exactly like a mobile payment.
- Insufficient balance / wrong PIN / terminated session each surface a clear error to the approval UI and reject the page Promise.

---

## Task 6 — Events, disconnect, and robust errors

- Emit `connect` (payload `{ upiId }`) after a successful connect, and `disconnect` when: the page calls `window.upi.disconnect()`, the user disconnects the wallet, or the session is **terminated** (the popup/approval already know via the Phase-1 ws; have the background clear the connected origin and push `disconnect` to affected tabs).
- Standardize page-facing errors: `{ code: 'user_rejected' | 'not_connected' | 'timeout' | 'insufficient_balance' | 'invalid_pin' | 'session_terminated' | 'internal', message }`.
- Handle concurrency: queue or reject a second `upi_pay` while one approval is open (don't open stacked windows for the same tab).

**Acceptance criteria**
- `window.upi.on('disconnect', …)` fires when the session is terminated from the phone.
- Rejecting or timing out yields a typed error, never a hanging Promise.

---

## Task 7 — Throwaway test page (verification only)

Add `web-demo/test-dapp.html` (a standalone file served over `http://localhost` via any static server — **not** part of the extension bundle) with buttons:
- "Detect" → shows `!!window.upi?.isInstaPay`.
- "Connect" → `await window.upi.connect()` → prints `{ upiId }`.
- "Pay ₹1 to <a test UPI id>" → `await window.upi.pay({ payeeUpiId, amount: 1, note: 'test' })` → prints the ack.
- Logs `connect`/`disconnect` events.

This is **only** a manual test fixture; Phase 4 replaces it with the real merchant checkout + SDK. Mark it clearly and keep it out of `dist/` (or in a `test/` folder).

**Acceptance criteria**
- From `test-dapp.html`, Detect → Connect → Pay completes end-to-end against a running backend, and the payee (another seeded user) receives the funds.

---

## Definition of Done for Phase 3

- [ ] Multi-entry MV3 build outputs popup + `provider.js` + `bridge.js` + `background.js`; manifest valid; popup unchanged.
- [ ] `window.upi` is injected at `document_start` on http/https pages with `connect()`, `request()`, `pay()`, `on()`.
- [ ] Provider ⇄ bridge ⇄ background ⇄ approval-window message pipeline works with nonce/origin checks.
- [ ] `connect()` opens a consent popup showing the real origin + account; resolves with `{ upiId }`.
- [ ] `upi_pay` opens a UPI-PIN approval popup, executes a **real** `/transaction/send`, returns `{ status, txnId }`, reflected in mobile history.
- [ ] The page never receives JWT/sessionToken/UPI PIN/balance; the background never receives the JWT/PIN.
- [ ] Reject/close/timeout → typed rejection; terminated session → payment blocked + `disconnect` event.
- [ ] Backend `tsc` clean; extension build clean; test-dapp flow verified manually.

## End-to-end test script (manual)
1. Backend up; two seeded users (payer paired to the extension, payee with a UPI id). Payer's wallet paired + a login PIN set (Phase 2).
2. Serve `test-dapp.html` on `http://localhost:xxxx`; open it in the same Chrome profile with the unpacked extension loaded.
3. Detect → true. Connect → consent popup shows the localhost origin + payer's UPI id → Connect → page prints `{ upiId }`.
4. Pay ₹1 to the payee → approval popup shows amount/payee/origin → enter UPI PIN → Approve → page prints `{ status: 'SUCCESS', txnId }`.
5. Check the mobile app history — the ₹1 transfer appears for both users.
6. Wrong UPI PIN → error, no transfer. Reject → page Promise rejects `user_rejected`.
7. Terminate the session from the phone mid-flow → payment blocked (401) and `disconnect` fires.

## Explicitly OUT of scope for Phase 3
- The merchant checkout page + reusable **gateway SDK** and the dedicated **backend gateway endpoint** (Phase 4).
- Multi-account selection in the approval (use the primary account; account picker is a nice-to-have later).
- Making `SendMoneyView` in the popup functional (separate from the dApp flow).

## Suggested commit sequence
1. `build(web-demo): multi-entry MV3 (crxjs) + manifest with content scripts & background`
2. `feat(web-demo): window.upi provider (MAIN world) + content bridge (ISOLATED)`
3. `feat(web-demo): background service worker — request router & approval window manager`
4. `feat(web-demo): approval flow (connect + UPI-PIN pay) reusing /transaction/send`
5. `feat(web-demo): provider events, disconnect on revocation, typed errors`
6. `test(web-demo): throwaway test-dapp page for window.upi verification`
