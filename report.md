# InstaPay / iPay — Project Status & Assessment Report

*Generated: 2026-07-18*

A "browser-native UPI wallet" prototype that borrows three proven UX patterns — a UPI mobile app, WhatsApp Web's QR pairing, and crypto-wallet browser injection (Phantom/MetaMask) — to let users approve UPI-style payments directly from the browser, without the constant laptop→gateway→phone round-trip.

> **Scope note:** This is a *simulated* prototype. No real bank accounts, RBI/NPCI rails, or money are involved.

---

## 1. The Benchmark — What "Done" Looks Like

Per `about.md`, the full system is **three interlocking projects** plus supporting infrastructure:

| # | Component | Core responsibility |
|---|-----------|---------------------|
| 1 | **Mobile UPI App** | Standard UPI app (pay by number/UPI ID, QR scan, balance, multiple accounts) **+** the ability to scan the browser wallet's QR to establish a paired session, keep a registry of active browser sessions, and **remotely terminate** a session (which instantly logs out the extension). |
| 2 | **Browser Extension Wallet** | A Phantom-style wallet living in the browser. After session pairing it requires a **4-digit login PIN**, injects a **`window.upi`** object so pages can detect & connect to it, and pops up an in-wallet approval prompt for each transaction. **No secrets in `localStorage`** — login PIN, UPI PIN, and all confidential data live only on the central backend; only session data is local. |
| 3 | **UPI Payment Gateway** | A checkout-side SDK/page that looks for `window.upi`, connects to the extension, sends a transaction request, triggers the wallet pop-up, and displays the confirmation/acknowledgement on completion. |
| — | **Central Bank Backend** | The custodial server that holds accounts, balances, PINs, sessions, and processes/records every transaction. |

The **defining innovation** is the *session-pairing + `window.upi` injection + gateway handshake* triangle. That is the part that makes this novel — everything else is a well-trodden UPI clone.

---

## 2. What Is Built Today

### Repository layout
```
Ipay/
├── backend/       Express + MongoDB API      ← REAL, working
├── mobile-app/    Expo / React Native app     ← REAL, working
├── web-demo/      Chrome extension (popup)     ← UI shell only, mocked
└── landingpage/   Marketing site (React/Vite)  ← Polished, static
```

### 2.1 Backend — **~70% of a conventional UPI backend** ✅
Real, functional Express + Mongoose API.
- **Auth** (`routes/auth.ts`): OTP send (Twilio SMS + Nodemailer email, with graceful fallback + console log), OTP verify, JWT issuance (7-day), profile setup, UPI PIN set, user lookup, user list. Generates `upiId` (`<mobile>@ipay`) and `qrCodeData` (`upi://pay?...`).
- **Bank** (`routes/bank.ts`): create demo account, fetch eligible accounts by mobile, link account to user, list a user's accounts, fetch by ID, **PIN-gated balance** endpoint.
- **Transaction** (`routes/transaction.ts`): `send` with sender/receiver resolution, UPI-PIN check, balance check, debit/credit with a **manual rollback** safety net, plus SUCCESS/FAILED logging; **history** by UPI ID.
- **Models**: `User`, `BankAccount`, `Transaction` — clean, timestamped schemas.

### 2.2 Mobile App — **Functional UPI app** ✅
Expo / React Native, wired to the backend (`utils/api.ts`).
- Screens: Login → OTP → Profile setup → Bank selection → Home (tab nav) → Pay-by-UPI → **QR Scan-to-Pay** (parses `upi://pay`) → Payment. Statistics screen is a stub.
- Real OTP login, real transactions, real QR *payment* scanning via `expo-camera`.

### 2.3 Browser Extension Wallet — **Beautiful shell, not wired** ⚠️
`web-demo/` — a Manifest V3 Chrome extension (popup only).
- Nicely designed popup UI: Landing/pair screen, Home, Statistics, Send Money, Menu, History, Notifications, bottom nav.
- **But it is entirely mock**: hardcoded balances and **dollar** amounts, fake contacts (`pravatar`), a **static QR string** (`instapay://connect?session=123456789`), and a "setup complete" button that just flips local state.

### 2.4 Landing Page — **Polished marketing site** ✅
`landingpage/` — scroll-reveal animations, animated background grid, device mockups depicting the intended checkout+extension+phone flow. Presentation-grade, non-functional by design.

---

## 3. What Is Pending — The Real Gap

The conventional UPI clone exists; **the three innovations that make this project special do not yet exist.**

| Area | Status | Gap |
|------|:------:|-----|
| **`window.upi` injection** | ❌ Missing | No content script, no injected provider, no background service worker. The extension is popup-only. |
| **Session pairing (QR handshake)** | ❌ Missing | Extension QR is a static string; mobile scanner only handles `upi://pay`. No pairing endpoint, no session token exchange. |
| **Session registry & remote termination** | ❌ Missing | No `Session` model, no "active devices" screen on mobile, no kill-switch that logs the extension out. |
| **Extension login-PIN gate** | ❌ Missing | Mock landing skips straight to the wallet; no 4-digit PIN verification against backend. |
| **Extension ↔ backend integration** | ❌ Missing | No fetch/axios anywhere in `web-demo`; all data hardcoded (and in USD, not INR). |
| **Payment gateway (Project #3)** | ❌ Missing | Does not exist as a project at all. |
| **Gateway ↔ wallet approval handshake** | ❌ Missing | No request → pop-up → sign → acknowledgement loop. |
| **Backend session/pairing/gateway APIs** | ❌ Missing | Backend has no session, pairing, or gateway-transaction endpoints. |
| Backend hardening | ⚠️ Weak | PINs stored **plaintext** (no hashing), in-memory OTP map (no expiry/TTL), JWT issued but **not enforced** on protected routes, no rate limiting. |
| Mobile Statistics screen | ⚠️ Stub | 15-line placeholder. |

---

## 4. Suggested Phased Roadmap

### Phase 0 — Foundation cleanup (1 week)
- Hash PINs (bcrypt); add OTP TTL/expiry; enforce JWT middleware on protected routes.
- Give `web-demo` a real API client; convert mock data to INR; remove hardcoded balances.
- Add a shared `Session` model (`userId`, `deviceLabel`, `sessionToken`, `status`, `createdAt`, `lastActive`).

### Phase 1 — Session pairing (the WhatsApp-Web moment) (1–2 weeks)
- Extension: generate a real pairing payload + QR (`instapay://connect?session=<serverToken>`), poll/subscribe for approval.
- Backend: `POST /session/create`, `POST /session/approve`, `GET /session/status`, `POST /session/terminate`.
- Mobile: extend the scanner to recognize the pairing QR and call `session/approve`; add an **"Active Sessions"** screen listing paired browsers with a **Terminate** button.
- Extension: on `terminated`, wipe local session and drop back to the pairing QR.

### Phase 2 — Login PIN + secure wallet unlock (3–5 days)
- Extension login-PIN screen → verify against backend; open wallet only on success.
- Confirm only session data touches `localStorage`; everything else stays server-side.

### Phase 3 — `window.upi` provider injection (1–2 weeks)
- Add content script + injected provider exposing `window.upi` (`connect()`, `request()`, event emitter) and a background service worker bridging page ↔ popup.
- In-wallet approval pop-up requiring the **UPI PIN** to sign; return acknowledgement to the page.

### Phase 4 — UPI Payment Gateway (Project #3) (1–2 weeks)
- A demo merchant/checkout page + lightweight SDK that detects `window.upi`, connects, sends a transaction request, and renders the confirmation on acknowledgement.
- Backend: gateway transaction endpoint that ties into the existing `transaction/send` logic.

### Phase 5 — End-to-end polish & demo (1 week)
- Full flow: checkout → detect wallet → approve in extension pop-up → backend settles → phone + browser both reflect it → terminate session from phone → extension logs out live.
- Finish Statistics screens; record a demo GIF/video; write a strong README with architecture diagram.

**Realistic remaining effort:** roughly **6–9 focused weeks** for a solo dev to reach a compelling end-to-end demo.

---

## 5. Concept Ratings (out of 10)

| Dimension | Score | Rationale |
|-----------|:-----:|-----------|
| **Idea / Originality** | **9/10** | A UPI browser wallet with `window.upi` injection is genuinely novel — nobody ships this today, and the WhatsApp-Web + Phantom analogy is sharp. |
| **Thought / Architecture reasoning** | **8/10** | Correctly identifies *why* crypto's local-key model can't port to UPI (custody + RBI/NPCI), and moves secrets server-side accordingly. Session-termination-as-security is a mature instinct. Loses a point: the plaintext-PIN/JWT-unenforced reality lags the stated security ambition. |
| **Problem framing** | **8/10** | The pain (laptop→gateway→phone→PIN round-trip, flaky on bad networks) is real and widely felt. Slightly narrow — it's a friction-reduction, not a step-change like UPI itself was. |
| **Design / UX** | **9/10** | Extension, mobile, and landing page are visually excellent and cohesive — well above typical student/portfolio quality. Held back only because the extension's polish isn't yet backed by function. |
| **Use case / Practicality** | **6/10** | Strong as a *prototype and portfolio piece*. As a real product it faces steep hurdles: NPCI/RBI compliance, gateway adoption of `window.upi`, and the fact that UPI apps deliberately keep signing on-device for security. |
| **Current execution / Completeness** | **5/10** | The conventional half (backend + mobile) works; the *innovative* half (pairing, injection, gateway) — the whole reason the project exists — is unbuilt. |

**Overall concept strength: ~8/10. Overall completion: ~40–45%.** The ambitious, hard, differentiating work is still ahead.

---

## 6. Resume / Portfolio Impact (if completed end-to-end)

**High impact — potentially a standout, "lead with it" project.**

- **Systems breadth in one project:** React Native (Expo), a Chrome MV3 extension with content-script injection, an Express/MongoDB backend, and a marketing site — full-stack + mobile + browser-platform depth that most new-grad/junior portfolios lack.
- **Hard, distinctive engineering:** cross-device QR session pairing, a `window.upi` provider + page↔extension↔backend messaging bridge, and remote session revocation are concrete, interview-rich talking points ("walk me through how the pairing handshake and injected provider work").
- **Fintech + security narrative:** custody model, why secrets stay server-side, session-based revocation — signals product and security thinking, not just CRUD.
- **Demo-ability:** the end-to-end flow (checkout → in-browser approval → phone kill-switch) is a memorable live demo / GIF, which recruiters and hiring managers remember.

**Caveats for resume value:**
- Impact is unlocked **only on completion of Phases 1–4**. As it stands (UPI clone + pretty mock extension), it reads as a solid-but-common payments app.
- Frame it honestly as a **simulation/prototype** — overstating "UPI/NPCI integration" invites scrutiny it can't survive.
- Ship the security hardening (hashed PINs, enforced JWT); a fintech project with plaintext PINs undercuts the very security story that makes it impressive.

**Bottom line:** The idea and design are already resume-grade. Finishing the pairing → injection → gateway triangle would turn this from "nice payments clone" into a **genuinely differentiated flagship project** worth putting at the top of a resume.
