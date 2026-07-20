import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus = 'CREATED' | 'PAID' | 'FAILED';

export interface IOrder extends Document {
  orderId: string;
  merchantId: mongoose.Types.ObjectId;
  merchantName: string;
  payeeUpiId: string;
  amount: number;
  note?: string;
  status: OrderStatus;
  paymentTxnId?: mongoose.Types.ObjectId;
  payerUpiId?: string;
}

const OrderSchema: Schema = new Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  merchantName: { type: String, required: true },
  payeeUpiId: { type: String, required: true },
  amount: { type: Number, required: true },
  note: { type: String },
  status: { type: String, enum: ['CREATED', 'PAID', 'FAILED'], default: 'CREATED' },
  paymentTxnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  payerUpiId: { type: String }
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', OrderSchema);
