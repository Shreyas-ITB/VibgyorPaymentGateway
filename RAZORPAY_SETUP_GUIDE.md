# Razorpay Setup Guide

## Getting Real Test Credentials

Razorpay provides **FREE test mode** credentials that work perfectly for development and testing!

### Step 1: Create a Razorpay Account

1. Go to [https://dashboard.razorpay.com/signup](https://dashboard.razorpay.com/signup)
2. Sign up with your email (it's FREE!)
3. Verify your email address
4. You'll be automatically in **Test Mode** (perfect for development)

### Step 2: Get Your Test API Keys

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Make sure you're in **Test Mode** (toggle in the top-left corner)
3. Go to **Settings** → **API Keys**
4. Click **Generate Test Key**
5. You'll get:
   - **Key ID**: Starts with `rzp_test_` (e.g., `rzp_test_1234567890abcd`)
   - **Key Secret**: A long string (keep this secret!)

### Step 3: Update Your .env File

Open `backend/.env` and update:

```env
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY_ID_HERE
RAZORPAY_KEY_SECRET=YOUR_ACTUAL_KEY_SECRET_HERE
```

### Step 4: Restart the Backend

```bash
cd backend
npm start
```

## Testing Payments

### Test Card Numbers (Razorpay Test Mode)

When the Razorpay checkout opens, use these test cards:

#### Successful Payment
- **Card Number**: `4111 1111 1111 1111`
- **CVV**: Any 3 digits (e.g., `123`)
- **Expiry**: Any future date (e.g., `12/25`)
- **Name**: Any name

#### Failed Payment (to test error handling)
- **Card Number**: `4000 0000 0000 0002`
- **CVV**: Any 3 digits
- **Expiry**: Any future date

#### Other Test Cards
- **Mastercard**: `5555 5555 5555 4444`
- **Amex**: `3782 822463 10005`
- **Visa Debit**: `4012 0010 3714 1112`

### Test UPI IDs
- **Success**: `success@razorpay`
- **Failure**: `failure@razorpay`

### Test Netbanking
- Select any bank and use:
  - **Username**: `test`
  - **Password**: `test`

## Important Notes

### Test Mode vs Live Mode

- **Test Mode** (FREE):
  - No real money involved
  - Perfect for development
  - Keys start with `rzp_test_`
  - No KYC required

- **Live Mode** (requires KYC):
  - Real money transactions
  - Requires business verification
  - Keys start with `rzp_live_`
  - Only use in production

### Security Best Practices

1. ✅ **NEVER** commit your `.env` file to Git
2. ✅ Keep your Key Secret private
3. ✅ Use Test Mode for development
4. ✅ Only switch to Live Mode after thorough testing

## Troubleshooting

### "Unknown error" when creating order

**Cause**: Invalid or dummy API keys

**Solution**: 
1. Get real test keys from Razorpay Dashboard
2. Update `backend/.env` with actual keys
3. Restart backend server

### "Authentication failed"

**Cause**: Incorrect Key Secret

**Solution**: 
1. Regenerate API keys in Razorpay Dashboard
2. Update both Key ID and Key Secret in `.env`
3. Restart backend

### Payment succeeds but verification fails

**Cause**: Incorrect Key Secret used for signature verification

**Solution**: 
1. Ensure the same Key Secret is used in `.env`
2. Check for extra spaces in the `.env` file
3. Restart backend after changes

## API Documentation

Once your backend is running with valid keys:

- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **API JSON**: http://localhost:3000/api-docs.json

## Next Steps

1. ✅ Get real Razorpay test credentials
2. ✅ Update `.env` file
3. ✅ Restart backend
4. ✅ Test payment flow with test cards
5. ✅ Check Razorpay Dashboard for test transactions

## Resources

- [Razorpay Test Cards](https://razorpay.com/docs/payments/payments/test-card-upi-details/)
- [Razorpay API Documentation](https://razorpay.com/docs/api/)
- [Razorpay Dashboard](https://dashboard.razorpay.com/)
