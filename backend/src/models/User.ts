import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  mobileNumber: string;
  email: string;
  name?: string;
  upiId?: string;
  upiPin?: string;
  loginPin?: string;
  loginPinAttempts: number;
  loginPinLockedUntil?: Date;
  qrCodeData?: string;
  linkedAccounts: mongoose.Types.ObjectId[];
  comparePin(candidate: string): Promise<boolean>;
  compareLoginPin(candidate: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  mobileNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String },
  upiId: { type: String, unique: true, sparse: true },
  // UPI PIN authorizes money movement; login PIN gates browser-wallet access.
  upiPin: { type: String },
  loginPin: { type: String },
  loginPinAttempts: { type: Number, default: 0 },
  loginPinLockedUntil: { type: Date },
  qrCodeData: { type: String },
  linkedAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' }]
}, { timestamps: true });

// A bcrypt hash always starts with $2a$/$2b$/$2y$; used to avoid double-hashing.
const isBcryptHash = (value: string) => /^\$2[aby]\$/.test(value);

// Hash the UPI PIN and login PIN whenever set/changed, unless already a hash.
// Async (promise-returning) pre-hooks resolve without an explicit `next`.
UserSchema.pre('save', async function () {
  const user = this as any;
  if (user.isModified('upiPin') && user.upiPin && !isBcryptHash(user.upiPin)) {
    user.upiPin = await bcrypt.hash(user.upiPin, 10);
  }
  if (user.isModified('loginPin') && user.loginPin && !isBcryptHash(user.loginPin)) {
    user.loginPin = await bcrypt.hash(user.loginPin, 10);
  }
});

UserSchema.methods.comparePin = async function (candidate: string): Promise<boolean> {
  if (!this.upiPin) return false;
  return bcrypt.compare(candidate, this.upiPin);
};

UserSchema.methods.compareLoginPin = async function (candidate: string): Promise<boolean> {
  if (!this.loginPin) return false;
  return bcrypt.compare(candidate, this.loginPin);
};

export default mongoose.model<IUser>('User', UserSchema);
