// InstaPay content bridge — runs in the page's ISOLATED world. It relays
// messages between the MAIN-world provider (via window.postMessage) and the
// background service worker (via a long-lived runtime Port). The requesting
// origin is taken from location.origin here, never trusted from the page.
import { CONTENT_PORT } from './protocol';
import type { PageMessage, PortMessage } from './protocol';

let providerNonce: string | null = null;

const toPage = (msg: Partial<PageMessage>) =>
  window.postMessage({ __instapay: true, nonce: providerNonce ?? undefined, ...msg } as PageMessage, window.location.origin);

// Announce readiness so a provider that loaded first re-sends its nonce.
window.postMessage({ __instapay: true, dir: 'bridgeReady' } as PageMessage, window.location.origin);

// ---- Port to background (auto-reconnects if the SW recycles) ----
let port: chrome.runtime.Port | null = null;

function connectPort() {
  port = chrome.runtime.connect({ name: CONTENT_PORT });
  port.onMessage.addListener((raw) => {
    const msg = raw as PortMessage;
    if (msg.type === 'response' && msg.id) {
      toPage({ dir: 'toPage', id: msg.id, result: msg.result, error: msg.error });
    } else if (msg.type === 'event' && msg.event) {
      toPage({ dir: 'event', event: msg.event, payload: msg.payload });
    }
  });
  port.onDisconnect.addListener(() => {
    port = null;
    // Reconnect on next use.
  });
}

function ensurePort(): chrome.runtime.Port {
  if (!port) connectPort();
  return port!;
}

// ---- Page -> background ----
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data as PageMessage;
  if (!data || data.__instapay !== true) return;

  // First contact from the provider carries the nonce we then require.
  if (data.dir === 'hello') {
    providerNonce = data.nonce ?? null;
    toPage({ dir: 'helloAck' });
    return;
  }

  if (data.dir !== 'toBridge' || !data.id) return;
  if (!providerNonce || data.nonce !== providerNonce) return; // reject spoofed messages

  try {
    ensurePort().postMessage({
      type: 'request',
      id: data.id,
      method: data.method,
      params: data.params,
      origin: window.location.origin,
    } as PortMessage);
  } catch {
    toPage({ dir: 'toPage', id: data.id, error: { code: 'internal', message: 'Extension unavailable' } });
  }
});
