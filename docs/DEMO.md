# Demo recording guide

Record these four short clips (5–15s each), export as GIF, and drop them in this
`docs/` folder with the exact filenames below. The root `README.md` already
references them, so they render as soon as the files exist.

| Order | Flow | Filename | What to capture |
|------|------|----------|-----------------|
| 1 | **Pairing** | `docs/01-pairing.gif` | Extension shows QR → scan on phone → wallet unlocks (create/enter login PIN) → real balance & history appear. |
| 2 | **`window.upi` pay** | `docs/02-window-upi-pay.gif` | The test page (`web-demo/test-dapp.html`) or store: connect → approval popup → UPI PIN → success; phone + browser both update. |
| 3 | **Gateway checkout** | `docs/03-gateway-checkout.gif` | The store's **Pay with InstaPay** → verified-order approval → success receipt (order id + payment ref). |
| 4 | **Remote kill-switch** | `docs/04-remote-terminate.gif` | Phone → **Linked Devices** → **Terminate** → the extension logs out **live** (drops back to the pairing QR). |

## Tips
- Seed first (`cd backend && npm run seed`) so amounts/history are populated and reproducible.
- Serve the store/test page over **http://localhost** (the provider injects on `http`/`https`, not `file://`).
- Crop each clip tightly to the relevant window; add a one-line caption.
- Suggested tools: macOS screen recording + [gifski](https://gif.ski/), or Kap, or `ffmpeg` to convert `.mov → .gif`.
- Keep each GIF small (< ~5 MB) so the README loads quickly.
