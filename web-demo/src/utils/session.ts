import { api, setAuthToken, BASE_URL } from './api';

// Only session data lives in local storage (per the project's security model):
// the polling secret and the issued JWT. No PINs or account data are stored.
const SESSION_TOKEN_KEY = 'instapay.sessionToken';
const JWT_KEY = 'instapay.jwt';

export interface StoredSession {
  sessionToken: string;
  jwt: string;
}

export type PairingStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface StatusResponse {
  status: PairingStatus;
  token?: string;
  user?: unknown;
}

/** A friendly label for this browser, e.g. "Chrome on macOS". */
export function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  let os = 'Unknown OS';
  if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';

  return `${browser} on ${os}`;
}

export function saveSession(session: StoredSession) {
  localStorage.setItem(SESSION_TOKEN_KEY, session.sessionToken);
  localStorage.setItem(JWT_KEY, session.jwt);
}

export function loadSession(): StoredSession | null {
  const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
  const jwt = localStorage.getItem(JWT_KEY);
  if (!sessionToken || !jwt) return null;
  return { sessionToken, jwt };
}

export function clearSession() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(JWT_KEY);
  setAuthToken(null);
}

/** Bootstrap a fresh PENDING session; returns the QR pairing code + polling token. */
export async function createPairing(): Promise<{
  sessionToken: string;
  pairingCode: string;
  expiresAt: string;
}> {
  const { data } = await api.post('/session/create', { deviceLabel: getDeviceLabel() });
  return data;
}

/**
 * Build the WebSocket URL for instant session-revocation pushes. Derives the
 * scheme from the API base: https -> wss, http -> ws. Strips the `/api` suffix.
 */
export function sessionSocketUrl(sessionToken: string): string {
  const httpBase = BASE_URL.replace(/\/api\/?$/, '');
  const wsBase = httpBase.replace(/^http/, 'ws'); // http->ws, https->wss
  return `${wsBase}/ws/session?sessionToken=${encodeURIComponent(sessionToken)}`;
}

/** Poll the pairing outcome for a given polling token. */
export async function pollStatus(sessionToken: string): Promise<StatusResponse> {
  try {
    const { data } = await api.get('/session/status', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    return data as StatusResponse;
  } catch (err: any) {
    // A 404 means the session record is gone — treat as terminated.
    if (err?.response?.status === 404) return { status: 'TERMINATED' };
    throw err;
  }
}
