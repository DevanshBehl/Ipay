// Shared message protocol between the injected provider (MAIN world), the
// content bridge (ISOLATED world), the background service worker, and the
// approval window. Bundled into each context by esbuild.

export const NAMESPACE = '__instapay';
export const CONTENT_PORT = 'instapay-content';

export type Method = 'upi_pay' | 'upi_getAccount' | 'connect' | 'disconnect';

export type ProviderEvent = 'connect' | 'disconnect' | 'accountChanged';

// page <-> bridge (window.postMessage)
export interface PageMessage {
  __instapay: true;
  nonce?: string;
  dir: 'hello' | 'helloAck' | 'bridgeReady' | 'toBridge' | 'toPage' | 'event';
  id?: string;
  method?: Method;
  params?: any;
  result?: any;
  error?: UpiError;
  event?: ProviderEvent;
  payload?: any;
}

// bridge <-> background (runtime Port)
export interface PortMessage {
  type: 'request' | 'response' | 'event';
  id?: string;
  method?: Method;
  params?: any;
  origin?: string;
  result?: any;
  error?: UpiError;
  event?: ProviderEvent;
  payload?: any;
}

// approval window <-> background (runtime.sendMessage)
export interface RuntimeRequest {
  type: 'getRequest' | 'resolveRequest';
  rid?: string;
  approved?: boolean;
  account?: { upiId: string; name?: string };
  txn?: { status: string; txnId?: string };
  error?: UpiError;
}

export interface PendingRequest {
  rid: string;
  method: Method;
  params: any;
  origin: string;
}

export type UpiErrorCode =
  | 'user_rejected'
  | 'not_connected'
  | 'timeout'
  | 'insufficient_balance'
  | 'invalid_pin'
  | 'session_terminated'
  | 'not_setup'
  | 'internal';

export interface UpiError {
  code: UpiErrorCode;
  message: string;
}

export const randomId = () =>
  (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
