# 🚀 Quick Start Guide

## The Problem You're Facing

You're seeing "Unknown error" because you're using dummy Razorpay keys (`rzp_test_xxxxx`). You need **real test credentials** from Razorpay!

## ✅ Solution (5 Minutes)

### Step 1: Get FREE Razorpay Test Credentials

1. Go to: https://dashboard.razorpay.com/signup
2. Sign up (it's FREE!)
3. After login, ensure you're in **Test Mode** (toggle top-left)
4. Go to: **Settings** → **API Keys**
5. Click: **Generate Test Key**
6. Copy both:
   - Key ID (starts with `rzp_test_`)
   - Key Secret (long string)

### Step 2: Update Backend Configuration

Open `backend/.env` and replace:

```env
RAZORPAY_KEY_ID=rzp_test_YOUR_REAL_KEY_HERE
RAZORPAY_KEY_SECRET=YOUR_REAL_SECRET_HERE
```

### Step 3: Restart Backend

```bash
cd backend
npm start
```

### Step 4: Test Payment

1. Open: http://localhost:5173
2. Click any pricing plan
3. Use test card: **4111 1111 1111 1111**
4. CVV: **123**
5. Expiry: **12/25**
6. ✅ Payment will succeed!

## 🎉 That's It!

Your payment gateway is now working with real Razorpay test mode!

## 📚 More Information

- Full setup guide: [RAZORPAY_SETUP_GUIDE.md](./RAZORPAY_SETUP_GUIDE.md)
- API Documentation: http://localhost:3000/api-docs
- Test cards: https://razorpay.com/docs/payments/payments/test-card-upi-details/

## ❓ Still Having Issues?

1. Make sure backend is running on port 3000
2. Make sure frontend is running on port 5173
3. Check that you copied the FULL key secret (no spaces)
4. Restart backend after changing .env

## 💡 Pro Tips

- Test Mode is FREE forever
- No real money involved in Test Mode
- You can see all test transactions in Razorpay Dashboard
- Switch to Live Mode only when ready for production (requires KYC)
