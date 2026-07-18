import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  mobileNumber: string;
  email: string;
  name?: string;
  upiId?: string;
  upiPin?: string;
  qrCodeData?: string;
  linkedAccounts: mongoose.Types.ObjectId[];
  comparePin(candidate: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  mobileNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String },
  upiId: { type: String, unique: true, sparse: true },
  upiPin: { type: String },
  qrCodeData: { type: String },
  linkedAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' }]
}, { timestamps: true });

// A bcrypt hash always starts with $2a$/$2b$/$2y$; used to avoid double-hashing.
const isBcryptHash = (value: string) => /^\$2[aby]\$/.test(value);

// Hash the UPI PIN whenever it is set/changed, unless it is already a hash.
// Async (promise-returning) pre-hooks resolve without an explicit `next`.
UserSchema.pre('save', async function () {
  const user = this as any;
  if (!user.isModified('upiPin') || !user.upiPin) return;
  if (isBcryptHash(user.upiPin)) return;
  user.upiPin = await bcrypt.hash(user.upiPin, 10);
});

UserSchema.methods.comparePin = async function (candidate: string): Promise<boolean> {
  if (!this.upiPin) return false;
  return bcrypt.compare(candidate, this.upiPin);
};

export default mongoose.model<IUser>('User', UserSchema);
