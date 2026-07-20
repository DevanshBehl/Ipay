import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchant extends Document {
  name: string;
  upiId: string; // must be an existing user's UPI id — funds land in that user's primary account
  keyId: string; // public merchant key used by the checkout SDK to create orders
}

const MerchantSchema: Schema = new Schema({
  name: { type: String, required: true },
  upiId: { type: String, required: true },
  keyId: { type: String, required: true, unique: true, index: true }
}, { timestamps: true });

// NOTE (prototype): a production gateway also has a keySecret used server-side to
// create/sign orders. Omitted here (simulated); order creation uses the public keyId.

export default mongoose.model<IMerchant>('Merchant', MerchantSchema);
