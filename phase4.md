# Phase 4 — UPI Payment Gateway (Project #3): Implementation Prompt

> **How to use this file:** Self-contained work order for an engineer or AI coding agent. This phase builds the **third project**: a merchant-side **payment gateway** — an embeddable **Checkout SDK** plus a demo store — that detects `window.upi`, creates a server-side **order**, drives the wallet approval, and renders the confirmation. It models the real Razorpay/Stripe pattern (server-created orders, wallet pays against the canonical order, merchant verifies server-side) adapted to UPI via the Phase-3 provider. Do **not** do the final polish / README / demo video / statistics finishing here — that's Phase 5.

---

## Context — where the code stands after Phase 3

```
Ipay/
├── backend/    Express 5 + Mongoose + TS. requireAuth (async, session-aware); ws revocation.
│               POST /transaction/send { senderUserId, senderBankAccountId, receiverUpiId, amount, upiPin }
│               (PIN + balance + transfer + rollback + Transaction log). GET /bank/user/:userId. GET /auth/me.
├── web-demo/   MV3 extension. window.upi injected (provider MAIN + bridge ISOLATED + background SW).
│               ApprovalFlow.tsx handles #/connect and #/approve; pay() runs /transaction/send with the UPI PIN.
├── mobile-app/ Expo / RN.
└── landingpage/ Marketing site.
```

**Phase-3 facts to build on:**
- `window.upi` exposes `connect()`, `disconnect()`, `request({ method, params })`, `pay({ payeeUpiId, amount, note?, merchantName? })`, `on()`. **The provider forwards arbitrary `params` untouched**, so passing an extra `orderId` needs **no** provider/bridge/background change.
- `web-demo/src/components/ApprovalFlow.tsx` — the approval window. Today (`#/approve`) it reads page-supplied `params.amount`/`params.payeeUpiId` and pays via `sendPayment()` → `/transaction/send`. **Phase 4 makes it order-aware** (Task 4).
- `web-demo/src/utils/wallet.ts` — `sendPayment(...)`; Phase 4 adds order fetch + order-pay helpers.
- Backend transfer logic lives inline in `backend/src/routes/transaction.ts`. **Phase 4 extracts it into a shared service** so the gateway can reuse it (Task 1).
- The "merchant" in this simulation is just another **User** with a `upiId` and a linked bank account (that's where funds land), exactly like any receiver in `/transaction/send`.

---

## Architecture — the gateway flow

```
  MERCHANT STORE PAGE  (demo, gateway/)                 BACKEND (gateway routes)          WALLET (Phase 3)
  ┌───────────────────────────────┐                    ┌───────────────────────┐
  │ "Pay ₹499 with InstaPay"       │                    │                        │
  │  → InstaPayCheckout SDK        │  1. POST /gateway/order {keyId,amount,note} │
  │                                │───────────────────▶│  create Order(CREATED) │
  │                                │◀───────────────────│  → { orderId, ... }    │
  │  2. window.upi.connect()       │─────────────────────────────────────────────▶ consent popup
  │  3. window.upi.pay({ orderId,  │─────────────────────────────────────────────▶ ┌───────────────────┐
  │       payeeUpiId, amount })    │                    │                        │  │ ApprovalFlow       │
  │                                │   4. GET /gateway/order/:id (canonical) ◀────│──│ fetch order, show  │
  │                                │                    │                        │  │ SERVER amount/payee│
  │                                │   5. POST /gateway/order/:id/pay ◀──────────│──│ UPI PIN → execute  │
  │                                │      (requireAuth) executeTransfer()+mark   │  │                    │
  │                                │◀────────── resolves window.upi.pay ─────────│──│ return {status,ref}│
  │  6. render confirmation        │                    │  Order = PAID          │  └───────────────────┘
  │  7. (optional) merchant server │   GET /gateway/order/:id → verify PAID      │
  └───────────────────────────────┘                    └───────────────────────┘
```

**Why order-based (the whole point of a "gateway"):**
- The **wallet displays and charges the amount/payee from the server-fetched order**, *never* the page-supplied params — so a tampered page can't show ₹1 while charging ₹1000.
- The merchant **verifies** the payment server-side (`GET /gateway/order/:id` → `PAID` + `paymentTxnId`), not by trusting the browser.
- Orders are **single-use** (`CREATED → PAID`), preventing replay/double-charge.

---

## Task 1 — Backend: extract a shared transfer service

Refactor the transfer core out of `backend/src/routes/transaction.ts` into `backend/src/services/transfer.ts` so both `/transaction/send` and the gateway can call it.

```ts
export type TransferErrorCode = 'INVALID_PIN' | 'INSUFFICIENT_BALANCE' | 'RECEIVER_NOT_FOUND'
  | 'SENDER_NOT_FOUND' | 'ACCOUNT_NOT_FOUND' | 'RECEIVER_NO_ACCOUNT';
export class TransferError extends Error { constructor(public code: TransferErrorCode, msg: string) { super(msg); } }

export async function executeTransfer(args: {
  senderUserId: string; senderBankAccountId: string; receiverUpiId: string; amount: number; upiPin: string;
}): Promise<{ transaction: ITransaction }>;
```
- Move the existing logic verbatim: resolve sender/receiver, `sender.comparePin(upiPin)`, resolve sender account, balance check, resolve receiver primary account, debit/credit with the manual-rollback safety, write the `Transaction` (SUCCESS/FAILED). Throw `TransferError` with the right code instead of writing HTTP responses.
- Update `POST /transaction/send` to call `executeTransfer` and map `TransferError.code` → the same HTTP responses/messages it returns today (keep the ownership `senderUserId === req.userId` check in the route).

**Acceptance criteria**
- `/transaction/send` behaves exactly as before (mobile + Phase-3 direct pay still work).
- `executeTransfer` is importable and unit-callable; error codes are typed.

---

## Task 2 — Backend: Merchant + Order models

`backend/src/models/Merchant.ts`
- `{ name, upiId, keyId (unique, e.g. 'ipay_test_<rand>'), createdAt }`.
- `upiId` must be an existing user's UPI id (funds land in that user's primary account, like any receiver). Document this.
- (Prototype note: a production gateway also has a `keySecret` for server-side order creation + signatures. Optional here — if included, store only a hash and don't expose it.)

`backend/src/models/Order.ts`
- `{ orderId (unique), merchantId (ref Merchant), merchantName, payeeUpiId, amount, note?, status: 'CREATED' | 'PAID' | 'FAILED', paymentTxnId?, payerUpiId?, createdAt }`.
- Index `orderId`.

**Acceptance criteria**
- Both models compile and are importable; `orderId` is unique.

---

## Task 3 — Backend: gateway routes

`backend/src/routes/gateway.ts`, mounted at `/api/gateway` (mixed public/protected — guard per route like `/api/auth`).

| Method | Path | Auth | Behaviour |
|--------|------|:----:|-----------|
| `POST` | `/gateway/merchant` | public (dev) | Body `{ name, upiId }`. Verify a `User` with that `upiId` exists (else `400`). Create a `Merchant` with a generated `keyId`. Return `{ keyId, name, upiId }`. (A seed/dev convenience; note it would be admin-gated in production.) |
| `POST` | `/gateway/order` | public | Body `{ keyId, amount, note? }`. Validate `amount > 0`. Look up merchant by `keyId` (else `401`). Create `Order` `{ orderId, merchantId, merchantName: merchant.name, payeeUpiId: merchant.upiId, amount, note, status: 'CREATED' }`. Return `{ orderId, amount, note, merchantName, payeeUpiId, status }`. |
| `GET`  | `/gateway/order/:orderId` | public | Return the order's **canonical** public fields `{ orderId, amount, note, merchantName, payeeUpiId, status, paymentTxnId? }`. No secrets. Used by both the wallet (to display/charge) and the merchant (to verify). |
| `POST` | `/gateway/order/:orderId/pay` | `requireAuth` | Body `{ senderBankAccountId, upiPin }`. Load the order; if not `CREATED` → `409 'Order already processed'`. Call `executeTransfer({ senderUserId: req.userId, senderBankAccountId, receiverUpiId: order.payeeUpiId, amount: order.amount, upiPin })`. On success: set `status='PAID'`, `paymentTxnId`, `payerUpiId` (payer's upiId), save; return `{ status:'PAID', orderId, paymentTxnId }`. On `TransferError`: if `INSUFFICIENT_BALANCE`/`INVALID_PIN` return `400`/`401` with the code; leave the order `CREATED` (retryable) or mark `FAILED` per your choice (document it). |

- Mount in `server.ts`: `app.use('/api/gateway', gatewayRoutes)` (do **not** blanket-`requireAuth`; only the pay route is protected — a revoked wallet's pay is blocked via the session-scoped JWT).
- **Amount authority is the order**, never the request body — `/pay` ignores any client-sent amount and uses `order.amount`.

**Acceptance criteria**
- Create merchant → create order → get order (`CREATED`) → pay (correct PIN) → order `PAID` with a `paymentTxnId`; a second pay on the same order → `409`.
- Wrong PIN / insufficient balance → typed error, order not `PAID`.
- Paying with a terminated session → `401`.

---

## Task 4 — Extension: make the approval window order-aware

Small change to `web-demo` only; **provider/bridge/background unchanged** (they already forward `orderId` in `params`).

- `web-demo/src/utils/wallet.ts` — add:
  ```ts
  export async function getOrder(orderId: string): Promise<{ orderId: string; amount: number; note?: string; merchantName: string; payeeUpiId: string; status: string }>;
  export async function payOrder(orderId: string, senderBankAccountId: string, upiPin: string): Promise<{ status: string; paymentTxnId?: string }>;
  ```
  (`getOrder` = `GET /gateway/order/:id`; `payOrder` = `POST /gateway/order/:id/pay`.)
- `web-demo/src/components/ApprovalFlow.tsx` — in `#/approve` mode, if `req.params.orderId` is present:
  - **Fetch the canonical order** via `getOrder(orderId)` and render **its** `amount`, `merchantName`, `payeeUpiId` (ignore page-supplied `amount`/`payeeUpiId` for both display and charge — anti-tamper). Show a small "Verified order" badge.
  - On approve, call `payOrder(orderId, account._id, pin)` (instead of `sendPayment`) and return `{ status, txnId: paymentTxnId }` to the page.
  - Handle `409` (already processed) and `401` (session terminated) with clear messages.
  - If no `orderId`, keep the existing Phase-3 direct-pay path unchanged.

**Acceptance criteria**
- A gateway pay shows server-verified amount/merchant even if the calling page lied about the amount.
- Approve executes exactly the order amount to the merchant and returns a payment reference to the page.

---

## Task 5 — The Checkout SDK (`gateway/` project)

New folder `gateway/` — the payment-gateway project. Build an **embeddable, framework-agnostic** SDK plus a demo store (Task 6). Recommend a small Vite app; the SDK itself is plain TS/JS with no framework deps so any site can embed it.

`gateway/src/instapay-checkout.ts` (built to a standalone `instapay-checkout.js` / ESM):
```ts
interface CheckoutConfig { keyId: string; apiBase?: string; } // apiBase default http://localhost:5001/api
interface CheckoutArgs { amount: number; note?: string; }
interface CheckoutResult { status: 'PAID' | 'FAILED'; orderId: string; paymentTxnId?: string; error?: { code: string; message: string }; }

export function InstaPayCheckout(config: CheckoutConfig): {
  isAvailable(): boolean;                       // !!window.upi?.isInstaPay (waits for upi#initialized)
  checkout(args: CheckoutArgs): Promise<CheckoutResult>;
};
```
`checkout()` flow:
1. `await ready()` — resolve `window.upi` (listen for `upi#initialized`, small timeout). If absent → `{ status:'FAILED', error:{ code:'NO_WALLET', ... } }`.
2. `POST {apiBase}/gateway/order { keyId, amount, note }` → `{ orderId, payeeUpiId, amount }`.
3. `await window.upi.connect()` (surface `user_rejected`).
4. `await window.upi.pay({ orderId, payeeUpiId, amount, note, merchantName })`.
5. Return `{ status:'PAID', orderId, paymentTxnId }`, or map wallet/backend errors to `{ status:'FAILED', error }`.

- (Prototype simplification to document: order creation uses the public `keyId` from the browser. A production gateway creates orders **server-side** with the merchant's secret and signs them; keep that note in the SDK README.)
- No secrets, no PIN, no JWT ever touch the SDK — it only speaks `window.upi` + the public gateway endpoints.

**Acceptance criteria**
- `InstaPayCheckout({ keyId }).isAvailable()` reflects wallet presence and survives late injection.
- `checkout({ amount })` returns `PAID` with a `paymentTxnId` on success and a typed `FAILED` on wallet-absent / rejected / insufficient-balance.

---

## Task 6 — Demo merchant store (uses the SDK)

`gateway/` app (`index.html` + a small store UI):
- A product/cart with a total and a **"Pay with InstaPay"** button (styled like a real checkout).
- On click → `InstaPayCheckout({ keyId: <demo key> }).checkout({ amount, note })`.
- Render states: idle → "waiting for wallet approval" → **success receipt** (order id + payment reference) or **failure** (typed error, retry).
- If `!isAvailable()`, show an "InstaPay wallet not detected — install/pair the extension" state instead of the pay button.
- A tiny config panel or `.env` for `keyId` + `apiBase` so the demo is runnable.

**Acceptance criteria**
- From the store, one click drives connect → approval → confirmation, end to end, over `http://localhost` (the provider injects on http/https, not `file://`).
- The receipt matches the backend order (`GET /gateway/order/:id` shows `PAID`).

---

## Task 7 — End-to-end verification (manual)

1. Seed two users: a **payer** (paired to the extension, login PIN set, funded linked account) and a **merchant user** (has a UPI id + linked account).
2. `POST /gateway/merchant { name:'Demo Store', upiId:<merchant upiId> }` → note the `keyId`; put it in the store config.
3. Load the built extension (`web-demo/dist`) unpacked; run the backend; serve the `gateway` store on `http://localhost`.
4. Store → Pay with InstaPay → connect consent → approval popup shows the **server** amount/merchant → UPI PIN → success receipt with a payment reference.
5. Try to tamper: have the page request a smaller amount than the order — the wallet still shows/charges the order amount.
6. Pay the same order twice → second attempt returns `409`.
7. Check the mobile app: the payer's history shows the debit, the merchant's shows the credit.

---

## Definition of Done for Phase 4

- [ ] Transfer core extracted to `services/transfer.ts`; `/transaction/send` unchanged in behaviour.
- [ ] `Merchant` + `Order` models; gateway routes (`merchant`, `order`, `order/:id`, `order/:id/pay`) mounted; only `/pay` is `requireAuth`.
- [ ] `/pay` uses the **order's** amount/payee (never the client's), is single-use (`409` on repeat), and reuses `executeTransfer`.
- [ ] Approval window is order-aware: fetches the canonical order, displays/charges server values, pays via the gateway endpoint. Provider/bridge/background untouched.
- [ ] `InstaPayCheckout` SDK: detect → create order → connect → pay → typed result.
- [ ] Demo store completes a real payment end to end; receipt reconciles with `GET /gateway/order/:id`.
- [ ] Backend `tsc` clean; extension build clean; gateway app build clean.

## Explicitly OUT of scope for Phase 4 (→ Phase 5)
- Final polish: finishing the mobile Statistics screen, the demo GIF/video, the architecture-diagram README.
- Webhooks / merchant server callbacks, refunds, multi-item invoices, merchant dashboards.
- Real merchant auth/signing (secret-based server-side order creation) — documented as a simplification.

## Suggested commit sequence
1. `refactor(backend): extract executeTransfer service; /transaction/send uses it`
2. `feat(backend): Merchant + Order models`
3. `feat(backend): gateway routes (order create/get/pay) reusing executeTransfer`
4. `feat(web-demo): order-aware approval (verified order amount/payee via gateway)`
5. `feat(gateway): InstaPayCheckout SDK (detect → order → connect → pay)`
6. `feat(gateway): demo merchant store using the checkout SDK`
