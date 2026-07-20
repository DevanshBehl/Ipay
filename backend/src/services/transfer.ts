import Transaction, { ITransaction } from '../models/Transaction';
import User from '../models/User';
import BankAccount from '../models/BankAccount';

export type TransferErrorCode =
  | 'INVALID_PIN'
  | 'INSUFFICIENT_BALANCE'
  | 'RECEIVER_NOT_FOUND'
  | 'SENDER_NOT_FOUND'
  | 'ACCOUNT_NOT_FOUND'
  | 'RECEIVER_NO_ACCOUNT'
  | 'TRANSFER_FAILED';

export class TransferError extends Error {
  constructor(public code: TransferErrorCode, message: string, public transaction?: ITransaction) {
    super(message);
    this.name = 'TransferError';
  }
}

// Core money-movement logic shared by /transaction/send and the payment gateway.
// Resolves sender/receiver, verifies the UPI PIN, checks balance, moves funds
// with manual rollback safety, and records a Transaction. Throws TransferError
// (never writes HTTP) so callers map codes to their own responses.
export async function executeTransfer(args: {
  senderUserId: string;
  senderBankAccountId: string;
  receiverUpiId: string;
  amount: number;
  upiPin: string;
}): Promise<{ transaction: ITransaction }> {
  const { senderUserId, senderBankAccountId, receiverUpiId, amount, upiPin } = args;

  const sender = await User.findById(senderUserId);
  const receiver = await User.findOne({ upiId: receiverUpiId });

  if (!sender) throw new TransferError('SENDER_NOT_FOUND', 'Sender not found');
  if (!receiver) throw new TransferError('RECEIVER_NOT_FOUND', 'Receiver not found');

  if (!sender.upiPin || !(await sender.comparePin(upiPin))) {
    throw new TransferError('INVALID_PIN', 'Invalid UPI PIN');
  }

  const senderAccount = await BankAccount.findById(senderBankAccountId);
  if (!senderAccount) throw new TransferError('ACCOUNT_NOT_FOUND', 'Sender account not found');

  if (senderAccount.balance < amount) {
    const failedTx = new Transaction({
      senderUpiId: sender.upiId,
      receiverUpiId: receiver.upiId,
      amount,
      status: 'FAILED'
    });
    await failedTx.save();
    throw new TransferError('INSUFFICIENT_BALANCE', 'Insufficient balance', failedTx);
  }

  // Receiver must have at least one linked account (primary is index 0)
  if (!receiver.linkedAccounts || receiver.linkedAccounts.length === 0) {
    throw new TransferError('RECEIVER_NO_ACCOUNT', 'Receiver has no linked bank account');
  }
  const receiverAccount = await BankAccount.findById(receiver.linkedAccounts[0]);
  if (!receiverAccount) {
    throw new TransferError('RECEIVER_NO_ACCOUNT', 'Receiver primary account not found');
  }

  // Perform transfer with basic manual rollback safety
  senderAccount.balance -= amount;
  receiverAccount.balance += amount;

  try {
    await senderAccount.save();
    await receiverAccount.save();
  } catch (saveError) {
    // Manual rollback if partial save fails
    senderAccount.balance += amount;
    receiverAccount.balance -= amount;
    await senderAccount.save().catch(e => console.error('CRITICAL: Failed to rollback sender', e));
    await receiverAccount.save().catch(e => console.error('CRITICAL: Failed to rollback receiver', e));
    throw new TransferError('TRANSFER_FAILED', 'Database transaction failed during save');
  }

  const successTx = new Transaction({
    senderUpiId: sender.upiId,
    receiverUpiId: receiver.upiId,
    amount,
    status: 'SUCCESS'
  });
  await successTx.save();

  return { transaction: successTx };
}
