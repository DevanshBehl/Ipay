// InstaPay provider — runs in the page's MAIN world and defines window.upi.
// It cannot use chrome.* APIs; it talks to the ISOLATED content bridge via
// window.postMessage, correlating requests by id.
import { randomId } from './protocol';
import type { PageMessage, Method, ProviderEvent, UpiError } from './protocol';

(() => {
  if ((window as any).upi?.isInstaPay) return; // avoid double-injection

  // Per-load nonce so the bridge can reject spoofed page messages.
  const nonce = randomId();

  const pending = new Map<string, { resolve: (v: any) => void; reject: (e: UpiError) => void }>();
  const listeners: Record<string, Set<(payload: any) => void>> = {};

  let connectedAccount: { upiId: string; name?: string } | null = null;

  const post = (msg: Partial<PageMessage>) =>
    window.postMessage({ __instapay: true, nonce, ...msg } as PageMessage, window.location.origin);

  const call = (method: Method, params?: any) =>
    new Promise<any>((resolve, reject) => {
      const id = randomId();
      pending.set(id, { resolve, reject });
      post({ dir: 'toBridge', id, method, params });
    });

  const emit = (event: ProviderEvent, payload: any) => {
    listeners[event]?.forEach((cb) => {
      try {
        cb(payload);
      } catch {
        /* listener threw */
      }
    });
  };

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data as PageMessage;
    if (!data || data.__instapay !== true) return;

    // Handshake messages carry no nonce and must be handled before the check.
    if (data.dir === 'bridgeReady') {
      post({ dir: 'hello' }); // (re)send our nonce now that the bridge is listening
      return;
    }
    if (data.dir === 'helloAck') return;

    if (data.nonce !== nonce) return;

    if (data.dir === 'toPage' && data.id) {
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);
      if (data.error) p.reject(data.error);
      else p.resolve(data.result);
    } else if (data.dir === 'event' && data.event) {
      if (data.event === 'connect') connectedAccount = data.payload ?? connectedAccount;
      if (data.event === 'disconnect') connectedAccount = null;
      emit(data.event, data.payload);
    }
  });

  const provider = {
    isInstaPay: true as const,
    get isConnected() {
      return connectedAccount !== null;
    },
    async connect() {
      const account = await call('connect');
      connectedAccount = account;
      emit('connect', account);
      return account as { upiId: string; name?: string };
    },
    async disconnect() {
      await call('disconnect');
      connectedAccount = null;
      emit('disconnect', undefined);
    },
    request(args: { method: Method; params?: any }) {
      return call(args.method, args.params);
    },
    pay(params: { payeeUpiId: string; amount: number; note?: string; merchantName?: string }) {
      return call('upi_pay', params) as Promise<{ status: string; txnId?: string }>;
    },
    on(event: ProviderEvent, cb: (payload: any) => void) {
      (listeners[event] ??= new Set()).add(cb);
    },
    removeListener(event: ProviderEvent, cb: (payload: any) => void) {
      listeners[event]?.delete(cb);
    },
  };

  Object.defineProperty(window, 'upi', { value: provider, writable: false, configurable: false });

  // Announce ourselves to the bridge, and to any page script waiting for late injection.
  post({ dir: 'hello' });
  window.dispatchEvent(new Event('upi#initialized'));

  // eslint-disable-next-line no-console
  console.debug('[InstaPay] window.upi injected');
})();
