import { Router } from 'express';
import Transaction from '../models/Transaction';
import { executeTransfer, TransferError } from '../services/transfer';

const router = Router();

router.post('/send', async (req, res) => {
  try {
    const { senderUserId, senderBankAccountId, receiverUpiId, amount, upiPin } = req.body;

    if (senderUserId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const { transaction } = await executeTransfer({ senderUserId, senderBankAccountId, receiverUpiId, amount, upiPin });
    res.json({ message: 'Transaction successful', transaction });
  } catch (error) {
    if (error instanceof TransferError) {
      switch (error.code) {
        case 'SENDER_NOT_FOUND':
        case 'RECEIVER_NOT_FOUND':
          return res.status(404).json({ error: 'Sender or receiver not found' });
        case 'INVALID_PIN':
          return res.status(401).json({ error: 'Invalid UPI PIN' });
        case 'ACCOUNT_NOT_FOUND':
          return res.status(404).json({ error: 'Sender account not found' });
        case 'INSUFFICIENT_BALANCE':
          return res.status(400).json({ error: 'Insufficient balance', transaction: error.transaction });
        case 'RECEIVER_NO_ACCOUNT':
          return res.status(400).json({ error: error.message });
      }
    }
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
