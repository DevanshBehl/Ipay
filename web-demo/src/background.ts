// InstaPay background service worker — the only context that can open windows
// and route between tabs. It never sees the JWT or UPI PIN; it just brokers
// requests between content bridges and the approval window (an extension page
// that holds the session and talks to the backend).
import { CONTENT_PORT, randomId } from './content/protocol';
import type { PortMessage, RuntimeRequest, Method, UpiError } from './content/protocol';

const APPROVAL_TIMEOUT_MS = 3 * 60 * 1000;

interface Pending {
  rid: string;
  portId: number;
  id: string; // the provider-side request id
  method: Method;
  params: any;
  origin: string;
  windowId?: number;
  timer?: ReturnType<typeof setTimeout>;
}

// In-memory state. Ports stay open (keeping the SW alive) for a request's life;
// params are also mirrored to storage.session so a fresh approval window can
// fetch them even if this worker was briefly recycled.
const ports = new Map<number, chrome.runtime.Port>();
const pending = new Map<string, Pending>();
let nextPortId = 1;

const err = (code: UpiError['code'], message: string): UpiError => ({ code, message });

type ConnectedMap = Record<string, { upiId: string; name?: string }>;

async function readConnected(): Promise<ConnectedMap> {
  const data = (await chrome.storage.session.get('connectedOrigins')) as { connectedOrigins?: ConnectedMap };
  return data.connectedOrigins ?? {};
}

async function cacheConnected(origin: string, account: { upiId: string; name?: string } | null) {
  const connectedOrigins = await readConnected();
  if (account) connectedOrigins[origin] = account;
  else delete connectedOrigins[origin];
  await chrome.storage.session.set({ connectedOrigins });
}

async function getConnected(origin: string): Promise<{ upiId: string; name?: string } | null> {
  const connectedOrigins = await readConnected();
  return connectedOrigins[origin] ?? null;
}

function respond(portId: number, id: string, result?: any, error?: UpiError) {
  const port = ports.get(portId);
  if (port) port.postMessage({ type: 'response', id, result, error } as PortMessage);
}

async function openApproval(kind: 'connect' | 'approve', p: Pending) {
  await chrome.storage.session.set({ [`req:${p.rid}`]: { method: p.method, params: p.params, origin: p.origin, rid: p.rid } });
  const url = chrome.runtime.getURL(`index.html#/${kind}?rid=${p.rid}`);
  const win = await chrome.windows.create({ url, type: 'popup', width: 380, height: 640, focused: true });
  p.windowId = win?.id;
  p.timer = setTimeout(() => finalize(p.rid, { approved: false, error: err('timeout', 'Approval timed out') }), APPROVAL_TIMEOUT_MS);
}

// Resolve a pending request and clean up.
async function finalize(rid: string, res: { approved: boolean; account?: any; txn?: any; error?: UpiError }) {
  const p = pending.get(rid);
  if (!p) return;
  pending.delete(rid);
  if (p.timer) clearTimeout(p.timer);
  await chrome.storage.session.remove(`req:${p.rid}`);

  if (!res.approved) {
    respond(p.portId, p.id, undefined, res.error ?? err('user_rejected', 'Request rejected'));
  } else if (p.method === 'connect') {
    await cacheConnected(p.origin, res.account);
    respond(p.portId, p.id, res.account);
  } else if (p.method === 'upi_pay') {
    respond(p.portId, p.id, res.txn);
  }

  if (p.windowId !== undefined) {
    chrome.windows.remove(p.windowId).catch(() => {});
  }
}

// ---- Content bridge connections ----
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== CONTENT_PORT) return;
  const portId = nextPortId++;
  ports.set(portId, port);

  port.onMessage.addListener(async (raw) => {
    const msg = raw as PortMessage;
    if (msg.type !== 'request' || !msg.id || !msg.method) return;
    const origin = msg.origin || 'unknown origin';

    if (msg.method === 'upi_getAccount') {
      const account = await getConnected(origin);
      if (account) respond(portId, msg.id, account);
      else respond(portId, msg.id, undefined, err('not_connected', 'Call connect() first'));
      return;
    }

    if (msg.method === 'disconnect') {
      await cacheConnected(origin, null);
      respond(portId, msg.id, { disconnected: true });
      port.postMessage({ type: 'event', event: 'disconnect' } as PortMessage);
      return;
    }

    if (msg.method === 'upi_pay') {
      const params = msg.params || {};
      if (!params.payeeUpiId || typeof params.amount !== 'number' || params.amount <= 0) {
        respond(portId, msg.id, undefined, err('internal', 'Invalid payment parameters'));
        return;
      }
    }

    const rid = randomId();
    const p: Pending = { rid, portId, id: msg.id, method: msg.method, params: msg.params, origin };
    pending.set(rid, p);
    try {
      await openApproval(msg.method === 'connect' ? 'connect' : 'approve', p);
    } catch {
      pending.delete(rid);
      respond(portId, msg.id, undefined, err('internal', 'Could not open approval window'));
    }
  });

  port.onDisconnect.addListener(() => ports.delete(portId));
});

// ---- Approval window messages ----
chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  const msg = raw as RuntimeRequest;
  if (msg.type === 'getRequest' && msg.rid) {
    chrome.storage.session.get(`req:${msg.rid}`).then((data) => sendResponse(data[`req:${msg.rid}`] ?? null));
    return true; // async response
  }
  if (msg.type === 'resolveRequest' && msg.rid) {
    finalize(msg.rid, { approved: !!msg.approved, account: msg.account, txn: msg.txn, error: msg.error });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

// If the approval window is closed without a decision, reject the request.
chrome.windows.onRemoved.addListener((windowId) => {
  for (const p of pending.values()) {
    if (p.windowId === windowId) {
      finalize(p.rid, { approved: false, error: err('user_rejected', 'Approval window closed') });
    }
  }
});
