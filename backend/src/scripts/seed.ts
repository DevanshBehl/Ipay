/**
 * Demo seed script — creates a reproducible world for demos/testing.
 * Run:  npm run seed            (local DB only)
 *       npm run seed -- --force (allow a non-local MONGO_URI, e.g. Atlas)
 *
 * Idempotent: users are upserted by mobileNumber; sample transactions among the
 * seed users are cleared and recreated so the demo state is deterministic.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import User from '../models/User';
import BankAccount from '../models/BankAccount';
import Transaction from '../models/Transaction';
import Merchant from '../models/Merchant';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ipay_simulation';
const force = process.argv.includes('--force');
const isLocal = /(127\.0\.0\.1|localhost)/.test(MONGO_URI);

interface SeedPerson {
  name: string;
  mobileNumber: string;
  email: string;
  upiPin: string;
  loginPin?: string;
  bankName: string;
  balance: number;
}

const PAYER: SeedPerson = { name: 'Aarav Sharma', mobileNumber: '9000000001', email: 'aarav@instapay.dev', upiPin: '1111', loginPin: '1234', bankName: 'HDFC Bank', balance: 50000 };
const MERCHANT: SeedPerson = { name: 'Nebula Store', mobileNumber: '9000000002', email: 'store@instapay.dev', upiPin: '2222', loginPin: '5678', bankName: 'ICICI Bank', balance: 0 };
const CONTACTS: SeedPerson[] = [
  { name: 'Priya Patel', mobileNumber: '9000000003', email: 'priya@instapay.dev', upiPin: '3333', bankName: 'SBI', balance: 20000 },
  { name: 'Rohan Verma', mobileNumber: '9000000004', email: 'rohan@instapay.dev', upiPin: '4444', bankName: 'Axis Bank', balance: 15000 },
];

const upiOf = (p: SeedPerson) => `${p.mobileNumber}@ipay`;

async function upsertPerson(p: SeedPerson) {
  let user = await User.findOne({ mobileNumber: p.mobileNumber });
  if (!user) user = new User({ mobileNumber: p.mobileNumber, email: p.email });

  user.name = p.name;
  user.email = p.email;
  user.upiId = upiOf(p);
  user.upiPin = p.upiPin; // hashed by pre-save hook
  if (p.loginPin) user.loginPin = p.loginPin;
  user.qrCodeData = `upi://pay?pa=${user.upiId}&pn=${encodeURIComponent(p.name)}&cu=INR`;

  // Ensure a linked bank account exists (idempotent by accountNumber).
  const accountNumber = `${p.mobileNumber}001`;
  let account = await BankAccount.findOne({ accountNumber });
  if (!account) {
    account = await BankAccount.create({
      accountNumber,
      accountHolderName: p.name,
      bankName: p.bankName,
      balance: p.balance,
      registeredMobileNumber: p.mobileNumber,
    });
  } else {
    account.balance = p.balance; // reset balance for a clean demo
    account.bankName = p.bankName;
    await account.save();
  }

  if (!user.linkedAccounts.some((id) => String(id) === String(account!._id))) {
    user.linkedAccounts.push(account._id as mongoose.Types.ObjectId);
  }
  await user.save();
  return { user, account };
}

async function main() {
  if (!isLocal && !force) {
    console.error(
      `\n⚠  MONGO_URI is not local (${MONGO_URI.replace(/\/\/[^@]*@/, '//<redacted>@')}).\n` +
      `   Refusing to seed a non-local database. Re-run with --force if this is intended:\n` +
      `   npm run seed -- --force\n`
    );
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB. Seeding…\n');

  const payer = await upsertPerson(PAYER);
  const merchant = await upsertPerson(MERCHANT);
  const contacts = [];
  for (const c of CONTACTS) contacts.push(await upsertPerson(c));

  // Merchant gateway record (reuse existing keyId if present so it's stable).
  let merchantRec = await Merchant.findOne({ upiId: upiOf(MERCHANT) });
  if (!merchantRec) {
    const keyId = `ipay_test_${new mongoose.Types.ObjectId().toHexString().slice(0, 16)}`;
    merchantRec = await Merchant.create({ name: MERCHANT.name, upiId: upiOf(MERCHANT), keyId });
  }

  // Deterministic sample transactions among the seed users.
  const seedUpis = [upiOf(PAYER), upiOf(MERCHANT), ...CONTACTS.map(upiOf)];
  await Transaction.deleteMany({ $or: [{ senderUpiId: { $in: seedUpis } }, { receiverUpiId: { $in: seedUpis } }] });

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const samples: Array<{ senderUpiId: string; receiverUpiId: string; amount: number; status: 'SUCCESS' | 'FAILED'; ago: number }> = [
    { senderUpiId: upiOf(CONTACTS[0]), receiverUpiId: upiOf(PAYER), amount: 2500, status: 'SUCCESS', ago: 0.2 },
    { senderUpiId: upiOf(PAYER), receiverUpiId: upiOf(CONTACTS[1]), amount: 800, status: 'SUCCESS', ago: 1 },
    { senderUpiId: upiOf(PAYER), receiverUpiId: upiOf(MERCHANT), amount: 1499, status: 'SUCCESS', ago: 2 },
    { senderUpiId: upiOf(CONTACTS[1]), receiverUpiId: upiOf(PAYER), amount: 5000, status: 'SUCCESS', ago: 3 },
    { senderUpiId: upiOf(PAYER), receiverUpiId: upiOf(CONTACTS[0]), amount: 12000, status: 'FAILED', ago: 4 },
    { senderUpiId: upiOf(PAYER), receiverUpiId: upiOf(CONTACTS[0]), amount: 350, status: 'SUCCESS', ago: 5 },
  ];
  for (const s of samples) {
    const tx = new Transaction({ senderUpiId: s.senderUpiId, receiverUpiId: s.receiverUpiId, amount: s.amount, status: s.status });
    const at = new Date(now - s.ago * day);
    tx.set('createdAt', at);
    tx.set('updatedAt', at);
    await tx.save({ timestamps: false });
  }

  // Summary
  console.log('✓ Seed complete.\n');
  console.log('─'.repeat(58));
  console.log('DEMO CREDENTIALS');
  console.log('─'.repeat(58));
  const line = (p: SeedPerson) =>
    console.log(`  ${p.name.padEnd(14)} mobile ${p.mobileNumber}  upi ${upiOf(p)}  upiPin ${p.upiPin}${p.loginPin ? `  loginPin ${p.loginPin}` : ''}`);
  line(PAYER);
  line(MERCHANT);
  CONTACTS.forEach(line);
  console.log('─'.repeat(58));
  console.log(`  Merchant keyId:  ${merchantRec.keyId}`);
  console.log('─'.repeat(58));
  console.log('\nNext steps:');
  console.log(`  • Mobile app: log in as ${PAYER.mobileNumber} (any email), it will OTP-verify; the profile/PINs are already set.`);
  console.log(`  • Extension: pair with the payer, unlock with login PIN ${PAYER.loginPin}.`);
  console.log(`  • Store (gateway): paste keyId ${merchantRec.keyId}, then Pay with InstaPay (UPI PIN ${PAYER.upiPin}).`);
  console.log('');

  void payer; void merchant; void contacts;
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
