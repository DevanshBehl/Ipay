// InstaPay Checkout SDK — embeddable, framework-agnostic. A merchant page uses
// it to detect the InstaPay wallet (window.upi), create a server-side order, and
// drive the wallet approval. It only ever speaks window.upi + the public gateway
// endpoints — no JWT, PIN, or secret ever passes through it.

// Minimal ambient shape of the Phase-3 provider.
interface UpiProvider {
  isInstaPay?: boolean;
  connect(): Promise<{ upiId: string; name?: string }>;
  pay(params: { orderId?: string; payeeUpiId: string; amount: number; note?: string; merchantName?: string }): Promise<{ status: string; txnId?: string }>;
  on(event: string, cb: (payload: any) => void): void;
}
declare global {
  interface Window {
    upi?: UpiProvider;
  }
}

export interface CheckoutConfig {
  keyId: string;
  apiBase?: string; // default http://localhost:5001/api
}

export interface CheckoutArgs {
  amount: number;
  note?: string;
}

export interface CheckoutResult {
  status: 'PAID' | 'FAILED';
  orderId?: string;
  paymentTxnId?: string;
  error?: { code: string; message: string };
}

const DEFAULT_API = 'http://localhost:5001/api';

// Resolve window.upi, tolerating late content-script injection.
function ready(timeoutMs = 1500): Promise<UpiProvider | null> {
  return new Promise((resolve) => {
    if (window.upi?.isInstaPay) return resolve(window.upi);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(window.upi?.isInstaPay ? window.upi : null);
    };
    window.addEventListener('upi#initialized', finish, { once: true });
    setTimeout(finish, timeoutMs);
  });
}

export function InstaPayCheckout(config: CheckoutConfig) {
  const apiBase = config.apiBase ?? DEFAULT_API;

  return {
    /** Whether the InstaPay wallet is present in this browser. */
    isAvailable(): boolean {
      return !!window.upi?.isInstaPay;
    },

    /** Run a full checkout: create order → connect → pay → result. */
    async checkout(args: CheckoutArgs): Promise<CheckoutResult> {
      const upi = await ready();
      if (!upi) {
        return { status: 'FAILED', error: { code: 'NO_WALLET', message: 'InstaPay wallet not detected' } };
      }

      // 1. Create the order on the gateway (public keyId).
      let order: { orderId: string; payeeUpiId: string; amount: number; merchantName: string; note?: string };
      try {
        const res = await fetch(`${apiBase}/gateway/order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyId: config.keyId, amount: args.amount, note: args.note }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { status: 'FAILED', error: { code: 'ORDER_FAILED', message: body.error || 'Could not create order' } };
        }
        order = await res.json();
      } catch {
        return { status: 'FAILED', error: { code: 'NETWORK', message: 'Could not reach the gateway' } };
      }

      // 2. Connect the wallet.
      try {
        await upi.connect();
      } catch (e: any) {
        return { status: 'FAILED', orderId: order.orderId, error: e?.code ? e : { code: 'user_rejected', message: 'Connection rejected' } };
      }

      // 3. Pay the order (wallet re-verifies amount/payee against the order).
      try {
        const result = await upi.pay({
          orderId: order.orderId,
          payeeUpiId: order.payeeUpiId,
          amount: order.amount,
          note: order.note,
          merchantName: order.merchantName,
        });
        if (result.status === 'PAID' || result.status === 'SUCCESS') {
          return { status: 'PAID', orderId: order.orderId, paymentTxnId: result.txnId };
        }
        return { status: 'FAILED', orderId: order.orderId, error: { code: 'NOT_PAID', message: `Order ${result.status}` } };
      } catch (e: any) {
        const err = e?.code ? e : { code: 'user_rejected', message: 'Payment not completed' };
        return { status: 'FAILED', orderId: order.orderId, error: err };
      }
    },
  };
}
