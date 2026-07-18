import mongoose, { Schema, Document } from 'mongoose';

export type SessionStatus = 'PENDING' | 'ACTIVE' | 'TERMINATED';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  sessionToken: string;
  deviceLabel: string;
  status: SessionStatus;
  pairingCode?: string;
  pairingExpiresAt?: Date;
  lastActiveAt: Date;
}

const SessionSchema: Schema = new Schema({
  // Owner of the browser session (set once the mobile app approves pairing).
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Long-lived token the extension stores locally to identify its session.
  sessionToken: { type: String, required: true, unique: true, index: true },
  deviceLabel: { type: String, default: 'Unknown device' },
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'TERMINATED'], default: 'PENDING' },
  // Short-lived code embedded in the pairing QR (Phase 1 consumes these).
  pairingCode: { type: String },
  pairingExpiresAt: { type: Date },
  lastActiveAt: { type: Date, default: Date.now }
}, { timestamps: true });

// NOTE (Phase 1): expiry of stale PENDING sessions is handled in application
// logic rather than a TTL index, so ACTIVE/TERMINATED sessions are never
// auto-deleted. A partial TTL index could replace this later if desired.

export default mongoose.model<ISession>('Session', SessionSchema);
