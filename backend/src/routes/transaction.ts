import { Router } from 'express';
import Transaction from '../models/Transaction';
import User from '../models/User';
import BankAccount from '../models/BankAccount';

const router = Router();

router.post('/send', async (req, res) => {
  try {
    const { senderUserId, senderBankAccountId, receiverUpiId, amount, upiPin } = req.body;

    const sender = await User.findById(senderUserId);
    const receiver = await User.findOne({ upiId: receiverUpiId });

    if (!sender || !receiver) {
      return res.status(404).json({ error: 'Sender or receiver not found' });
    }

    if (!sender.upiPin || sender.upiPin !== upiPin) {
      return res.status(401).json({ error: 'Invalid UPI PIN' });
    }

    const senderAccount = await BankAccount.findById(senderBankAccountId);
    if (!senderAccount) return res.status(404).json({ error: 'Sender account not found' });
    
    if (senderAccount.balance < amount) {
      const failedTx = new Transaction({
        senderUpiId: sender.upiId,
        receiverUpiId: receiver.upiId,
        amount,
        status: 'FAILED'
      });
      await failedTx.save();
      return res.status(400).json({ error: 'Insufficient balance', transaction: failedTx });
    }

    // Receiver must have at least one linked account (primary is index 0)
    if (!receiver.linkedAccounts || receiver.linkedAccounts.length === 0) {
        return res.status(400).json({ error: 'Receiver has no linked bank account' });
    }
    const receiverAccount = await BankAccount.findById(receiver.linkedAccounts[0]);
    if (!receiverAccount) {
        return res.status(400).json({ error: 'Receiver primary account not found' });
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
      await senderAccount.save().catch(e => console.error("CRITICAL: Failed to rollback sender", e));
      await receiverAccount.save().catch(e => console.error("CRITICAL: Failed to rollback receiver", e));
      throw new Error('Database transaction failed during save');
    }

    const successTx = new Transaction({
      senderUpiId: sender.upiId,
      receiverUpiId: receiver.upiId,
      amount,
      status: 'SUCCESS'
    });
    await successTx.save();

    res.json({ message: 'Transaction successful', transaction: successTx });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Transaction failed' });
  }
});

router.get('/history/:upiId', async (req, res) => {
  try {
    const { upiId } = req.params;
    const transactions = await Transaction.find({
      $or: [{ senderUpiId: upiId }, { receiverUpiId: upiId }]
    }).sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
