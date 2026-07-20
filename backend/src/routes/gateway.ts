import { Router } from 'express';
import crypto from 'crypto';
import Merchant from '../models/Merchant';
import Order from '../models/Order';
import User from '../models/User';
import { requireAuth } from '../middleware/auth';
import { executeTransfer, TransferError } from '../services/transfer';

const router = Router();

// Create a merchant (dev/seed convenience; would be admin-gated in production).
router.post('/merchant', async (req, res) => {
  try {
    const { name, upiId } = req.body;
    if (!name || !upiId) return res.status(400).json({ error: 'name and upiId are required' });

    const payee = await User.findOne({ upiId });
    if (!payee) return res.status(400).json({ error: 'No user with that UPI id — funds would have nowhere to land' });

    const keyId = `ipay_test_${crypto.randomBytes(8).toString('hex')}`;
    const merchant = await Merchant.create({ name, upiId, keyId });
    res.json({ keyId: merchant.keyId, name: merchant.name, upiId: merchant.upiId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create merchant' });
  }
});

// Create an order (called by the checkout SDK with the public keyId).
router.post('/order', async (req, res) => {
  try {
    const { keyId, amount, note } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }
    const merchant = await Merchant.findOne({ keyId });
    if (!merchant) return res.status(401).json({ error: 'Invalid merchant key' });

    const orderId = `order_${crypto.randomBytes(10).toString('hex')}`;
    const order = await Order.create({
      orderId,
      merchantId: merchant._id,
      merchantName: merchant.name,
      payeeUpiId: merchant.upiId,
      amount,
      note,
      status: 'CREATED'
    });

    res.json({
      orderId: order.orderId,
      amount: order.amount,
      note: order.note,
      merchantName: order.merchantName,
      payeeUpiId: order.payeeUpiId,
      status: order.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Send a collect request to a specific UPI ID
router.post('/order/:orderId/request', async (req, res) => {
  try {
    const { payerUpiId } = req.body;
    if (!payerUpiId) return res.status(400).json({ error: 'payerUpiId is required' });

    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'CREATED') return res.status(409).json({ error: 'Order already processed' });

    order.payerUpiId = payerUpiId;
    await order.save();

    res.json({ message: 'Request sent', orderId: order.orderId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// Mobile app polls this to find pending requests directed at its UPI ID
router.get('/pending-requests/:upiId', async (req, res) => {
  try {
    const { upiId } = req.params;
    const orders = await Order.find({ payerUpiId: upiId, status: 'CREATED' });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// Canonical order details — read by both the wallet (to display/charge) and the
// merchant (to verify). Never returns secrets.
router.get('/order/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({
      orderId: order.orderId,
      amount: order.amount,
      note: order.note,
      merchantName: order.merchantName,
      payeeUpiId: order.payeeUpiId,
      status: order.status,
      paymentTxnId: order.paymentTxnId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Pay an order — the wallet user authorizes with their UPI PIN. The amount and
// payee come from the ORDER, never from the request body (anti-tamper).
router.post('/order/:orderId/pay', requireAuth, async (req, res) => {
  try {
    const { senderBankAccountId, upiPin } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'CREATED') return res.status(409).json({ error: 'Order already processed' });

    const { transaction } = await executeTransfer({
      senderUserId: req.userId as string,
      senderBankAccountId,
      receiverUpiId: order.payeeUpiId,
      amount: order.amount,
      upiPin
    });

    const payer = await User.findById(req.userId).select('upiId');
    order.status = 'PAID';
    order.paymentTxnId = transaction._id as any;
    order.payerUpiId = payer?.upiId;
    await order.save();

    res.json({ status: 'PAID', orderId: order.orderId, paymentTxnId: transaction._id });
  } catch (error) {
    if (error instanceof TransferError) {
      switch (error.code) {
        case 'INVALID_PIN':
          return res.status(401).json({ error: 'Invalid UPI PIN' });
        case 'INSUFFICIENT_BALANCE':
          return res.status(400).json({ error: 'Insufficient balance' });
        case 'ACCOUNT_NOT_FOUND':
          return res.status(404).json({ error: 'Sender account not found' });
        case 'RECEIVER_NOT_FOUND':
        case 'RECEIVER_NO_ACCOUNT':
          return res.status(400).json({ error: 'Merchant account cannot receive funds' });
        case 'SENDER_NOT_FOUND':
          return res.status(404).json({ error: 'Payer not found' });
      }
    }
    console.error(error);
    res.status(500).json({ error: 'Payment failed' });
  }
});

export default router;
