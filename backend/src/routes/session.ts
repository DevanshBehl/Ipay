import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Session from '../models/Session';
import User from '../models/User';
import { requireAuth } from '../middleware/auth';
import { notifySessionTerminated } from '../realtime/sessionSocket';

const router = Router();

const PAIRING_TTL_MS = 2 * 60 * 1000; // pairing code valid for 2 minutes

const readSessionToken = (req: any): string | null => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();
  if (typeof req.query.sessionToken === 'string') return req.query.sessionToken;
  return null;
};

// Extension bootstraps a new PENDING session and gets its QR pairing code.
router.post('/create', async (req, res) => {
  try {
    const { deviceLabel } = req.body;
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const pairingCode = crypto.randomBytes(6).toString('hex');
    const pairingExpiresAt = new Date(Date.now() + PAIRING_TTL_MS);

    await Session.create({
      sessionToken,
      pairingCode,
      deviceLabel: deviceLabel || 'Unknown device',
      status: 'PENDING',
      pairingExpiresAt,
      lastActiveAt: new Date()
    });

    res.json({ sessionToken, pairingCode, expiresAt: pairingExpiresAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Extension polls this with its sessionToken to learn the pairing outcome.
router.get('/status', async (req, res) => {
  try {
    const sessionToken = readSessionToken(req);
    if (!sessionToken) return res.status(400).json({ error: 'sessionToken required' });

    const session = await Session.findOne({ sessionToken });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (session.status === 'TERMINATED') {
      return res.json({ status: 'TERMINATED' });
    }

    if (session.status === 'PENDING') {
      if (session.pairingExpiresAt && session.pairingExpiresAt.getTime() < Date.now()) {
        return res.json({ status: 'EXPIRED' });
      }
      return res.json({ status: 'PENDING' });
    }

    // ACTIVE: hand the extension a scoped JWT (carries sessionId so it can be revoked).
    session.lastActiveAt = new Date();
    await session.save();

    const token = jwt.sign(
      { userId: session.userId, sessionId: session._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );
    const user = await User.findById(session.userId).select('-upiPin');

    res.json({ status: 'ACTIVE', token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch session status' });
  }
});

// Mobile app (logged in) approves a scanned pairing code.
router.post('/approve', requireAuth, async (req, res) => {
  try {
    const { pairingCode } = req.body;
    if (!pairingCode) return res.status(400).json({ error: 'pairingCode required' });

    const session = await Session.findOne({
      pairingCode,
      status: 'PENDING',
      pairingExpiresAt: { $gte: new Date() }
    });
    if (!session) return res.status(400).json({ error: 'Invalid or expired pairing code' });

    session.userId = req.userId as any;
    session.status = 'ACTIVE';
    session.lastActiveAt = new Date();
    session.pairingCode = undefined;
    session.pairingExpiresAt = undefined;
    await session.save();

    res.json({ success: true, deviceLabel: session.deviceLabel });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve session' });
  }
});

// Mobile app lists the user's active browser sessions.
router.get('/list', requireAuth, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.userId, status: 'ACTIVE' })
      .sort({ lastActiveAt: -1 })
      .select('_id deviceLabel lastActiveAt createdAt');
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// Mobile app revokes a browser session.
router.post('/terminate', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (String(session.userId) !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    session.status = 'TERMINATED';
    await session.save();

    // Push the revocation to the browser instantly (no waiting for its poll).
    notifySessionTerminated(String(session._id));

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to terminate session' });
  }
});

export default router;
