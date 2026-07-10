import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import User from '../models/User';

const router = Router();
const otps = new Map<string, string>(); // In-memory OTP storage for simplicity

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) 
  : null;
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to your preferred SMTP service
  auth: {
    user: process.env.SMTP_EMAIL || 'dummy@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'dummy',
  },
});
router.post('/send-otp', async (req, res) => {
  try {
    const { mobileNumber, email } = req.body;
    if (!mobileNumber || !email) return res.status(400).json({ error: 'Mobile number and email are required' });

    // Generate random 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    otps.set(mobileNumber, otp); // Still keying by mobileNumber for simplicity

    console.log(`OTP for ${mobileNumber} and ${email} is ${otp}`);

    // Try sending real SMS if Twilio is configured
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      await twilioClient.messages.create({
        body: `Your InstaPay OTP is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: mobileNumber
      }).catch(err => console.error('Twilio Error:', err));
    }

    // Try sending real email if SMTP is configured
    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      const emailHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; border: 1px solid #e0e0e0;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #00E676; margin: 0; font-size: 28px; letter-spacing: -1px;">InstaPay</h1>
            <p style="color: #888; margin: 5px 0 0 0; font-size: 14px;">Fast, Secure & Simple UPI</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h2 style="color: #333; margin-top: 0; font-size: 20px;">Verification Code</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">Hello,</p>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">Please use the following One-Time Password (OTP) to securely log into your InstaPay account. This code is valid for 10 minutes.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #00E676; border-radius: 8px; padding: 15px 30px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #166534;">${otp}</span>
              </div>
            </div>
            
            <p style="color: #777; font-size: 14px; margin-bottom: 0;">If you did not request this code, please ignore this email. Do not share this code with anyone, including InstaPay employees.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #aaa; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} InstaPay. All rights reserved.</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"InstaPay Security" <${process.env.SMTP_EMAIL}>`,
        to: email,
        subject: 'Your InstaPay Verification Code',
        html: emailHtml,
      }).catch(err => console.error('Nodemailer Error:', err));
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { mobileNumber, email, otp } = req.body;
    if (otps.get(mobileNumber) !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    otps.delete(mobileNumber);

    let user = await User.findOne({ mobileNumber });
    let isNewUser = false;
    
    if (!user) {
      // Check if email is already in use by another account
      const existingEmailUser = await User.findOne({ email });
      if (existingEmailUser) {
        return res.status(400).json({ error: 'Email is already linked to another mobile number.' });
      }
      user = new User({ mobileNumber, email });
      await user.save();
      isNewUser = true;
    } else if (user.email !== email) {
      // Check if the new email is already used by another user
      const existingEmailUser = await User.findOne({ email });
      if (existingEmailUser && existingEmailUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({ error: 'Email is already linked to another mobile number.' });
      }
      // Update email if it changed (optional, but good for returning users entering different email)
      user.email = email;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    
    res.json({ token, user, isNewUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

router.post('/setup-profile', async (req, res) => {
  try {
    const { userId, name, upiPin } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.name = name;
    if (upiPin) user.upiPin = upiPin;
    user.upiId = `${user.mobileNumber}@ipay`;
    user.qrCodeData = `upi://pay?pa=${user.upiId}&pn=${encodeURIComponent(name)}&cu=INR`;
    await user.save();

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to setup profile' });
  }
});

router.post('/set-pin', async (req, res) => {
  try {
    const { userId, upiPin } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.upiPin = upiPin;
    await user.save();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to set PIN' });
  }
});

router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { exclude } = req.query; // e.g. /api/auth/users?exclude=userId
    let query = {};
    if (exclude) {
      query = { _id: { $ne: exclude } };
    }
    const users = await User.find(query).select('-__v');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
