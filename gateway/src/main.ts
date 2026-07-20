import { InstaPayCheckout } from './instapay-checkout';
import QRCode from 'qrcode';

const AMOUNT = 1499;
const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:5001/api';
const defaultKey = (import.meta.env.VITE_INSTAPAY_KEY as string | undefined) ?? '';

// Elements
const keyInput = document.getElementById('key') as HTMLInputElement;
const walletBadge = document.getElementById('walletBadge') as HTMLDivElement;
const instaPayBanner = document.getElementById('instaPayBanner') as HTMLDivElement;
const payWithWalletBtn = document.getElementById('payWithWalletBtn') as HTMLButtonElement;
const payWithCardBtn = document.getElementById('payWithCardBtn') as HTMLButtonElement;
const payWithUpiIdBtn = document.getElementById('payWithUpiIdBtn') as HTMLButtonElement;
const upiIdInput = document.getElementById('upiIdInput') as HTMLInputElement;
const qrcodeContainer = document.getElementById('qrcode') as HTMLDivElement;

const successOverlay = document.getElementById('successOverlay') as HTMLDivElement;
const succOrderId = document.getElementById('succOrderId') as HTMLSpanElement;
const succTxnId = document.getElementById('succTxnId') as HTMLSpanElement;

// Init
keyInput.value = defaultKey;

// Tab Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Reset buttons
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('bg-surface', 'text-white', 'shadow-sm', 'border', 'border-border');
      b.classList.add('text-textMuted');
    });
    const targetBtn = e.target as HTMLButtonElement;
    targetBtn.classList.remove('text-textMuted');
    targetBtn.classList.add('bg-surface', 'text-white', 'shadow-sm', 'border', 'border-border');

    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    // Show target
    document.getElementById(targetBtn.dataset.target!)?.classList.add('active');
  });
});

// Generate QR Code
const merchantUpiId = "ipay_merchant@ipay"; // Mock static UPI ID for the QR code
const qrString = `upi://pay?pa=${merchantUpiId}&pn=Nebula Store&am=${AMOUNT}&cu=INR`;
QRCode.toDataURL(qrString, { width: 140, margin: 0, color: { dark: '#000000', light: '#ffffff' } }, (err, url) => {
  if (!err && url) {
    qrcodeContainer.innerHTML = `<img src="${url}" alt="UPI QR Code" />`;
  }
});

function showSuccess(orderId: string, txnId: string) {
  succOrderId.textContent = orderId;
  succTxnId.textContent = txnId;
  successOverlay.classList.add('show');
}

function simulateLoadingBtn(btn: HTMLButtonElement, originalText: string, duration: number, callback: () => void) {
  btn.disabled = true;
  btn.innerHTML = `<svg class="animate-spin-slow h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...`;
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = originalText;
    callback();
  }, duration);
}

// Wallet Detection
const refreshBadge = () => {
  const available = !!window.upi?.isInstaPay;
  if (available) {
    walletBadge.classList.remove('hidden');
    instaPayBanner.classList.remove('hidden');
  } else {
    walletBadge.classList.add('hidden');
    instaPayBanner.classList.add('hidden');
  }
};
window.addEventListener('upi#initialized', refreshBadge);
setTimeout(refreshBadge, 300);

// Payment Handlers

// 1. Pay with InstaPay Wallet (Real Flow)
payWithWalletBtn.addEventListener('click', async () => {
  const keyId = keyInput.value.trim();
  if (!keyId) return alert('Enter merchant keyId at the bottom first.');

  payWithWalletBtn.disabled = true;
  payWithWalletBtn.textContent = 'Waiting for approval...';

  const checkout = InstaPayCheckout({ keyId, apiBase });
  const result = await checkout.checkout({ amount: AMOUNT, note: 'Nebula Hoodie' });

  if (result.status === 'PAID') {
    showSuccess(result.orderId || 'UNKNOWN', result.paymentTxnId || 'N/A');
  } else {
    alert(`Payment failed: ${result.error?.message}`);
    payWithWalletBtn.textContent = 'Pay ₹1,499';
    payWithWalletBtn.disabled = false;
  }
});

// 2. Pay with Card (Mock Flow)
payWithCardBtn.addEventListener('click', () => {
  simulateLoadingBtn(payWithCardBtn, 'Pay ₹1,499', 2000, () => {
    showSuccess('mock_ord_card_782x', 'mock_txn_cd_90x1');
  });
});

// 3. Pay with Manual UPI ID (Real Collect Request Flow)
payWithUpiIdBtn.addEventListener('click', async () => {
  const upiId = upiIdInput.value.trim();
  const keyId = keyInput.value.trim();
  
  if (!upiId) return alert('Please enter a UPI ID first.');
  if (!keyId) return alert('Please enter merchant keyId first.');

  payWithUpiIdBtn.disabled = true;
  payWithUpiIdBtn.innerHTML = `<svg class="animate-spin-slow h-5 w-5 text-black inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Approve on phone...`;

  try {
    // 1. Create order
    const orderRes = await fetch(`${apiBase}/gateway/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId, amount: AMOUNT, note: 'Nebula Hoodie' }),
    });
    if (!orderRes.ok) throw new Error('Failed to create order');
    const order = await orderRes.json();

    // 2. Request collect from phone
    const reqRes = await fetch(`${apiBase}/gateway/order/${order.orderId}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payerUpiId: upiId }),
    });
    if (!reqRes.ok) throw new Error('Failed to send collect request to that UPI ID');

    // 3. Poll for payment success
    const pollInterval = setInterval(async () => {
      try {
        const checkRes = await fetch(`${apiBase}/gateway/order/${order.orderId}`);
        const check = await checkRes.json();
        
        if (check.status === 'PAID') {
          clearInterval(pollInterval);
          payWithUpiIdBtn.disabled = false;
          payWithUpiIdBtn.innerHTML = 'Proceed';
          showSuccess(check.orderId, check.paymentTxnId || 'N/A');
        } else if (check.status === 'FAILED') {
          clearInterval(pollInterval);
          alert('Payment was declined or failed.');
          payWithUpiIdBtn.disabled = false;
          payWithUpiIdBtn.innerHTML = 'Proceed';
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 2000);

  } catch (error: any) {
    alert(error.message);
    payWithUpiIdBtn.disabled = false;
    payWithUpiIdBtn.innerHTML = 'Proceed';
  }
});
