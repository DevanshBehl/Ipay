import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { URL } from 'url';
import Session from '../models/Session';

// Live browser sockets, keyed by sessionId. A session can have more than one
// socket briefly (e.g. a reconnect racing an old connection).
const sockets = new Map<string, Set<WebSocket>>();

interface AliveSocket extends WebSocket {
  isAlive?: boolean;
}

const register = (sessionId: string, ws: WebSocket) => {
  let set = sockets.get(sessionId);
  if (!set) {
    set = new Set();
    sockets.set(sessionId, set);
  }
  set.add(ws);
};

const unregister = (sessionId: string, ws: WebSocket) => {
  const set = sockets.get(sessionId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) sockets.delete(sessionId);
};

/**
 * Push a terminated event to every live socket for a session and close them.
 * Called by the /session/terminate route so revocation is instant.
 */
export function notifySessionTerminated(sessionId: string) {
  const id = String(sessionId);
  const set = sockets.get(id);
  if (!set) return;
  for (const ws of set) {
    try {
      ws.send(JSON.stringify({ type: 'terminated' }));
      ws.close();
    } catch {
      /* socket already gone */
    }
  }
  sockets.delete(id);
}

/**
 * Attach a raw WebSocket server to the existing HTTP server. The extension
 * connects to  ws(s)://<host>/ws/session?sessionToken=<token>  and is dropped
 * the instant its session is terminated.
 */
export function initSessionSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws/session' });

  wss.on('connection', async (ws: AliveSocket, req) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    try {
      const url = new URL(req.url || '', 'http://localhost');
      const sessionToken = url.searchParams.get('sessionToken');
      if (!sessionToken) {
        ws.close();
        return;
      }

      const session = await Session.findOne({ sessionToken });
      if (!session || session.status !== 'ACTIVE') {
        // Already revoked (or never valid) — tell the client and close.
        ws.send(JSON.stringify({ type: 'terminated' }));
        ws.close();
        return;
      }

      const id = String(session._id);
      register(id, ws);
      ws.send(JSON.stringify({ type: 'connected' }));
      ws.on('close', () => unregister(id, ws));
    } catch {
      try {
        ws.close();
      } catch {
        /* noop */
      }
    }
  });

  // Heartbeat: drop sockets that stop responding to pings.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients as Set<AliveSocket>) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        /* noop */
      }
    }
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));
}
