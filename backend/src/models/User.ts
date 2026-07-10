import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  mobileNumber: string;
  email: string;
  name?: string;
  upiId?: string;
  upiPin?: string;
  qrCodeData?: string;
  linkedAccounts: mongoose.Types.ObjectId[];
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

export default mongoose.model<IUser>('User', UserSchema);
