import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  senderUpiId: string;
  receiverUpiId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

const TransactionSchema: Schema = new Schema({
  senderUpiId: { type: String, required: true },
  receiverUpiId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'PENDING' }
}, { timestamps: true });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
