import { api } from './api';

export interface Account {
  _id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

export interface RawTxn {
  _id: string;
  senderUpiId: string;
  receiverUpiId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  createdAt: string;
}

/** Linked bank accounts for a user. */
export async function getAccounts(userId: string): Promise<Account[]> {
  const { data } = await api.get(`/bank/user/${userId}`);
  return data;
}

/** Transaction history for a UPI id (sender or receiver). */
export async function getHistory(upiId: string): Promise<RawTxn[]> {
  const { data } = await api.get(`/transaction/history/${encodeURIComponent(upiId)}`);
  return data;
}

/** Reveal a balance — gated by the UPI PIN on the backend. */
export async function revealBalance(userId: string, bankAccountId: string, upiPin: string): Promise<number> {
  const { data } = await api.post('/bank/balance', { userId, bankAccountId, upiPin });
  return data.balance;
}

export interface Contact {
  _id: string;
  name?: string;
  upiId?: string;
  mobileNumber?: string;
}

/** Other users who can receive money (for the Send screen). */
export async function getContacts(excludeUserId: string): Promise<Contact[]> {
  const { data } = await api.get('/auth/users', { params: { exclude: excludeUserId } });
  return (data as Contact[]).filter((u) => !!u.upiId);
}

export interface GatewayOrder {
  orderId: string;
  amount: number;
  note?: string;
  merchantName: string;
  payeeUpiId: string;
  status: string;
}

/** Fetch the canonical (server-verified) order the wallet must display and charge. */
export async function getOrder(orderId: string): Promise<GatewayOrder> {
  const { data } = await api.get(`/gateway/order/${orderId}`);
  return data;
}

/** Pay a gateway order — the backend uses the order's amount/payee, not ours. */
export async function payOrder(
  orderId: string,
  senderBankAccountId: string,
  upiPin: string
): Promise<{ status: string; paymentTxnId?: string }> {
  const { data } = await api.post(`/gateway/order/${orderId}/pay`, { senderBankAccountId, upiPin });
  return { status: data.status, paymentTxnId: data.paymentTxnId };
}

/** Execute a payment via the existing transfer endpoint (reused for dApp pay). */
export async function sendPayment(args: {
  senderUserId: string;
  senderBankAccountId: string;
  receiverUpiId: string;
  amount: number;
  upiPin: string;
}): Promise<{ status: string; txnId?: string }> {
  const { data } = await api.post('/transaction/send', {
    senderUserId: args.senderUserId,
    senderBankAccountId: args.senderBankAccountId,
    receiverUpiId: args.receiverUpiId,
    amount: args.amount,
    upiPin: args.upiPin,
  });
  return { status: data.transaction?.status || 'SUCCESS', txnId: data.transaction?._id };
}
