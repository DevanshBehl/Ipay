import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Session from '../models/Session';

// Make req.userId / req.sessionId available to route handlers after authentication.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      sessionId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      userId: string;
      sessionId?: string;
    };
    req.userId = payload.userId;

    // Extension tokens carry a sessionId; a terminated/missing session must be
    // rejected so a revoked browser cannot keep calling protected APIs. Mobile
    // tokens have no sessionId and skip this check entirely.
    if (payload.sessionId) {
      const session = await Session.findById(payload.sessionId);
      if (!session || session.status !== 'ACTIVE') {
        return res.status(401).json({ error: 'Session terminated' });
      }
      req.sessionId = payload.sessionId;
      session.lastActiveAt = new Date();
      await session.save();
    }

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
