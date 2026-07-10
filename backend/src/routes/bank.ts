import { Router } from 'express';
import BankAccount from '../models/BankAccount';
import User from '../models/User';

const router = Router();

// Create demo bank account (used by web app)
router.post('/create', async (req, res) => {
  try {
    const { accountNumber, accountHolderName, bankName, balance, registeredMobileNumber } = req.body;
    
    const account = new BankAccount({
      accountNumber,
      accountHolderName,
      bankName,
      balance,
      registeredMobileNumber
    });
    
    await account.save();
    res.json({ message: 'Bank account created successfully', account });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create bank account' });
  }
});

// Fetch user's eligible bank accounts (matching mobile number)
router.get('/eligible/:mobileNumber', async (req, res) => {
  try {
    const { mobileNumber } = req.params;
    const accounts = await BankAccount.find({ registeredMobileNumber: mobileNumber });
    res.json(accounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch eligible accounts' });
  }
});

// Link account to user
router.post('/link', async (req, res) => {
  try {
    const { userId, bankAccountId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.linkedAccounts.includes(bankAccountId)) {
      user.linkedAccounts.push(bankAccountId);
      await user.save();
    }
    
    res.json({ message: 'Account linked successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to link account' });
  }
});

// Fetch all bank accounts for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const accounts = await BankAccount.find({ _id: { $in: user.linkedAccounts } });
    res.json(accounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user accounts' });
  }
});

// Fetch a specific bank account by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const account = await BankAccount.findById(id);
    if (!account) return res.status(404).json({ error: 'Bank account not found' });
    res.json(account);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch bank account' });
  }
});

// Securely fetch balance using UPI PIN
router.post('/balance', async (req, res) => {
  try {
    const { userId, bankAccountId, upiPin } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.upiPin || user.upiPin !== upiPin) {
      return res.status(401).json({ error: 'Invalid UPI PIN' });
    }

    const account = await BankAccount.findById(bankAccountId);
    if (!account) return res.status(404).json({ error: 'Bank account not found' });

    // Verify this account belongs to the user
    if (!user.linkedAccounts.includes(account._id)) {
      return res.status(403).json({ error: 'Account not linked to this user' });
    }

    res.json({ balance: account.balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

export default router;
