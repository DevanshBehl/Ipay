import { InstaPayCheckout } from './instapay-checkout';

const AMOUNT = 1499;
const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:5001/api';
const defaultKey = (import.meta.env.VITE_INSTAPAY_KEY as string | undefined) ?? '';

const badge = document.getElementById('walletBadge') as HTMLSpanElement;
const keyInput = document.getElementById('key') as HTMLInputElement;
const payBtn = document.getElementById('payBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

keyInput.value = defaultKey;

function setStatus(kind: 'pending' | 'success' | 'error', html: string) {
  statusEl.className = `status show ${kind}`;
  statusEl.innerHTML = html;
}

// Reflect wallet availability (the SDK waits for late injection).
const refreshBadge = () => {
  const available = !!window.upi?.isInstaPay;
  badge.textContent = available ? 'wallet: connected' : 'wallet: not detected';
  badge.className = `wallet-badge ${available ? 'on' : 'off'}`;
};
window.addEventListener('upi#initialized', refreshBadge);
setTimeout(refreshBadge, 300);

payBtn.addEventListener('click', async () => {
  const keyId = keyInput.value.trim();
  if (!keyId) {
    setStatus('error', 'Enter your merchant keyId (create one via POST /gateway/merchant).');
    return;
  }

  payBtn.disabled = true;
  setStatus('pending', 'Waiting for wallet approval…');

  const checkout = InstaPayCheckout({ keyId, apiBase });
  const result = await checkout.checkout({ amount: AMOUNT, note: 'Nebula Hoodie' });

  if (result.status === 'PAID') {
    setStatus(
      'success',
      `✓ Payment successful<br><br>Order: <code>${result.orderId}</code><br>Payment ref: <code>${result.paymentTxnId ?? '—'}</code>`
    );
  } else {
    setStatus('error', `✗ Payment failed — ${result.error?.message ?? 'unknown error'} <code>(${result.error?.code ?? ''})</code>`);
  }
  payBtn.disabled = false;
});
