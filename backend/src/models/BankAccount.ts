import mongoose, { Schema, Document } from 'mongoose';

export interface IBankAccount extends Document {
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  balance: number;
  registeredMobileNumber: string;
}

const BankAccountSchema: Schema = new Schema({
  accountNumber: { type: String, required: true },
  accountHolderName: { type: String, required: true },
  bankName: { type: String, required: true },
  balance: { type: Number, default: 0 },
  registeredMobileNumber: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);
