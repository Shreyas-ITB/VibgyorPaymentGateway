# Base64 Encoding Guide for Pricing Data

This guide explains how to pass pricing data to the Vibgyor Payment Gateway using base64 encoding.

## Overview

The payment gateway now supports receiving pricing data in three formats:
1. **JSON Object** - Direct JavaScript object
2. **URL-encoded JSON String** - JSON string with URL encoding
3. **Base64 Encoded JSON String** - JSON string encoded in base64 (NEW)

## Why Base64 Encoding?

Base64 encoding offers several advantages:
- **Cleaner URLs** - No special characters that need escaping
- **Shorter URLs** - More compact than URL-encoded JSON
- **Better Security** - Obfuscates the data structure from casual viewing
- **Easier Integration** - Many programming languages have built-in base64 support

## How to Use Base64 Encoding

### Step 1: Prepare Your JSON Data

Create your pricing data JSON with the required structure:

```json
{
  "plans": [
    {
      "plan_id": "basic",
      "name": "Basic Plan",
      "monthly_amount": 999,
      "annual_amount": 9990,
      "features": ["Feature 1", "Feature 2"]
    },
    {
      "plan_id": "pro",
      "name": "Professional Plan",
      "monthly_amount": 2999,
      "annual_amount": 29990,
      "features": ["All Basic features", "Feature 3", "Feature 4"]
    },
    {
      "plan_id": "enterprise",
      "name": "Enterprise Plan",
      "monthly_amount": 9999,
      "annual_amount": 99990,
      "features": ["All Pro features", "Feature 5", "Feature 6"]
    }
  ],
  "redirect_url": "https://yoursite.com/payment-callback",
  "payment_provider": "razorpay"
}
```

### Step 2: Encode to Base64

#### JavaScript/Node.js
```javascript
const pricingData = {
  plans: [...],
  redirect_url: "https://yoursite.com/payment-callback",
  payment_provider: "razorpay"
};

// Convert to JSON string
const jsonString = JSON.stringify(pricingData);

// Encode to base64
const base64String = btoa(jsonString); // Browser
// OR
const base64String = Buffer.from(jsonString).toString('base64'); // Node.js

console.log(base64String);
```

#### Python
```python
import json
import base64

pricing_data = {
    "plans": [...],
    "redirect_url": "https://yoursite.com/payment-callback",
    "payment_provider": "razorpay"
}

# Convert to JSON string
json_string = json.dumps(pricing_data)

# Encode to base64
base64_string = base64.b64encode(json_string.encode()).decode()

print(base64_string)
```

#### PHP
```php
<?php
$pricingData = [
    'plans' => [...],
    'redirect_url' => 'https://yoursite.com/payment-callback',
    'payment_provider' => 'razorpay'
];

// Convert to JSON string
$jsonString = json_encode($pricingData);

// Encode to base64
$base64String = base64_encode($jsonString);

echo $base64String;
?>
```

### Step 3: Pass to Payment Gateway

Add the base64 string as a URL parameter:

```
https://payment-gateway.example.com/?data=eyJwbGFucyI6W3sicGxhbl9pZCI6ImJhc2ljIiwibmFtZSI6IkJhc2ljIFBsYW4iLCJtb250aGx5X2Ftb3VudCI6OTk5LCJhbm51YWxfYW1vdW50Ijo5OTkwLCJmZWF0dXJlcyI6WyJGZWF0dXJlIDEiLCJGZWF0dXJlIDIiXX1dLCJyZWRpcmVjdF91cmwiOiJodHRwczovL3lvdXJzaXRlLmNvbS9wYXltZW50LWNhbGxiYWNrIiwicGF5bWVudF9wcm92aWRlciI6InJhem9ycGF5In0=
```

## Complete Example

### JavaScript Example
```javascript
// Your pricing data
const pricingData = {
  plans: [
    {
      plan_id: "basic",
      name: "Basic Plan",
      monthly_amount: 999,
      annual_amount: 9990,
      features: ["Up to 10 users", "Basic support", "10GB storage"]
    },
    {
      plan_id: "pro",
      name: "Professional Plan",
      monthly_amount: 2999,
      annual_amount: 29990,
      features: ["Up to 50 users", "Priority support", "100GB storage"]
    },
    {
      plan_id: "enterprise",
      name: "Enterprise Plan",
      monthly_amount: 9999,
      annual_amount: 99990,
      features: ["Unlimited users", "24/7 support", "Unlimited storage"]
    }
  ],
  redirect_url: "https://yoursite.com/payment-callback",
  payment_provider: "razorpay"
};

// Encode to base64
const base64Data = btoa(JSON.stringify(pricingData));

// Construct payment gateway URL
const paymentGatewayUrl = `https://payment-gateway.example.com/?data=${base64Data}`;

// Redirect user to payment gateway
window.location.href = paymentGatewayUrl;
```

### Node.js Backend Example
```javascript
const express = require('express');
const app = express();

app.get('/initiate-payment', (req, res) => {
  const pricingData = {
    plans: [
      // ... your plans
    ],
    redirect_url: "https://yoursite.com/payment-callback",
    payment_provider: "razorpay"
  };

  // Encode to base64
  const base64Data = Buffer.from(JSON.stringify(pricingData)).toString('base64');

  // Construct payment gateway URL
  const paymentGatewayUrl = `https://payment-gateway.example.com/?data=${base64Data}`;

  // Redirect user
  res.redirect(paymentGatewayUrl);
});
```

## Automatic Detection

The payment gateway automatically detects the format:
1. If the `data` parameter looks like base64 (only contains A-Z, a-z, 0-9, +, /, =), it tries base64 decoding first
2. If base64 decoding fails, it falls back to parsing as regular JSON
3. If both fail, an error is shown to the user

## Testing

You can test base64 encoding locally:

### Using the Test HTML Page

Open `test-base64-encoding.html` in your browser:
1. Edit the JSON data in the textarea
2. Click "Encode to Base64" to generate the encoded string
3. Click "Open Payment Gateway" to test with the encoded data
4. The page shows URL length comparison between base64 and URL-encoded formats

### Manual Testing

```bash
# Navigate to frontend directory
cd frontend

# Run the development server
npm start

# Open browser with base64 encoded data
# The URL will automatically decode and display the pricing page
```

### Test URL Example
```
http://localhost:4200/?data=eyJwbGFucyI6W3sicGxhbl9pZCI6ImJhc2ljIiwibmFtZSI6IkJhc2ljIiwibW9udGhseV9hbW91bnQiOjk5OSwiYW5udWFsX2Ftb3VudCI6OTk5MCwiZmVhdHVyZXMiOlsiRmVhdHVyZSAxIiwiRmVhdHVyZSAyIl19LHsicGxhbl9pZCI6InBybyIsIm5hbWUiOiJQcm8iLCJtb250aGx5X2Ftb3VudCI6Mjk5OSwiYW5udWFsX2Ftb3VudCI6Mjk5OTAsImZlYXR1cmVzIjpbIkZlYXR1cmUgMyIsIkZlYXR1cmUgNCJdfSx7InBsYW5faWQiOiJlbnRlcnByaXNlIiwibmFtZSI6IkVudGVycHJpc2UiLCJtb250aGx5X2Ftb3VudCI6OTk5OSwiYW5udWFsX2Ftb3VudCI6OTk5OTAsImZlYXR1cmVzIjpbIkZlYXR1cmUgNSIsIkZlYXR1cmUgNiJdfV0sInJlZGlyZWN0X3VybCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9zdWNjZXNzIiwicGF5bWVudF9wcm92aWRlciI6InJhem9ycGF5In0=
```

## Required Fields

The JSON data must include:
- `plans` - Array of exactly 3 pricing plans
- `redirect_url` - URL to redirect after payment
- `payment_provider` (optional) - Either "razorpay" or "pinelabs"

Each plan must have:
- `plan_id` - Unique identifier
- `name` - Display name
- `monthly_amount` - Price in smallest currency unit (paise for INR)
- `annual_amount` - Annual price in smallest currency unit
- `features` - Array of feature strings (at least 1)

## Error Handling

If the base64 data is invalid or malformed:
- The user will see an error message
- The error will be logged to the browser console
- The user can contact support for assistance

## Security Notes

- Base64 is NOT encryption - it's just encoding
- Don't include sensitive data in the pricing payload
- Always validate data on the backend
- Use HTTPS for all payment gateway URLs
- The payment gateway validates all incoming data

## Comparison: URL-encoded vs Base64

### URL-encoded JSON
```
?data=%7B%22plans%22%3A%5B%7B%22plan_id%22%3A%22basic%22%2C%22name%22%3A%22Basic%22%7D%5D%7D
```

### Base64 encoded JSON
```
?data=eyJwbGFucyI6W3sicGxhbl9pZCI6ImJhc2ljIiwibmFtZSI6IkJhc2ljIn1dfQ==
```

Base64 is typically shorter and cleaner!

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify your JSON structure matches the required format
3. Test with the provided examples
4. Contact technical support with the error details
