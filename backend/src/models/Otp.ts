import mongoose, { Schema, Document } from 'mongoose';

export interface IOtp extends Document {
  mobileNumber: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
}

const OtpSchema: Schema = new Schema({
  mobileNumber: { type: String, required: true, index: true },
  email: { type: String, required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// TTL index: MongoDB removes the document once `expiresAt` passes.
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IOtp>('Otp', OtpSchema);
