# Vibgyor Payment Gateway - Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Environment Configuration](#environment-configuration)
4. [Provider Configuration](#provider-configuration)
5. [Deployment Options](#deployment-options)
6. [Testing Procedures](#testing-procedures)
7. [External Site Integration](#external-site-integration)
8. [Postman Testing](#postman-testing)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Vibgyor Payment Gateway is a full-stack payment processing system that enables external websites to offer subscription purchases through a unified interface. The system consists of:

- **Frontend**: Angular application with Vite and Tailwind CSS
- **Backend**: Node.js/Express API server with TypeScript
- **Payment Providers**: Razorpay or PineLabs (configurable)

### Key Features

- Multi-provider support (Razorpay/PineLabs)
- Secure payment processing with webhook verification
- Responsive design with automatic theme detection
- Docker-based deployment
- Comprehensive API for external integration

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         External Site                           │
│                      (example.com)                              │
└────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ Redirects user with JSON data
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Payment Gateway Frontend                      │
│                   (Angular + Nginx)                             │
│                   Port: 8080                                    │
│                                                                 │
│  - Receives pricing data via URL parameter                     │
│  - Displays pricing cards                                      │
│  - Handles billing cycle toggle                                │
│  - Initiates payment flow                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ API Calls (HTTPS)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Payment Gateway Backend                       │
│                   (Node.js + Express)                           │
│                   Port: 3000                                    │
│                                                                 │
│  - Payment initiation                                          │
│  - Payment verification                                        │
│  - Webhook handling                                            │
│  - Subscription management                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Provider API Calls (HTTPS)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Payment Provider                              │
│                   (Razorpay or PineLabs)                        │
│                                                                 │
│  - Payment processing                                          │
│  - Webhook notifications                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **External Site** → Redirects user to Payment Gateway with pricing data
2. **Frontend** → Displays pricing plans and captures user selection
3. **Frontend** → Calls backend `/api/payment/initiate` to create order
4. **Backend** → Creates order with payment provider
5. **Frontend** → Launches payment provider's UI
6. **Payment Provider** → Processes payment
7. **Payment Provider** → Sends webhook to backend
8. **Backend** → Verifies payment and creates subscription
9. **Frontend** → Redirects user back to external site with subscription details


---

## Environment Configuration

### Backend Environment Variables

The backend requires configuration via environment variables. Create a `.env` file in the `backend/` directory:

#### Required Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PAYMENT_PROVIDER` | **Yes** | Payment gateway to use: `razorpay` or `pinelabs` | `razorpay` |
| `PORT` | No | Backend server port | `3000` |
| `NODE_ENV` | No | Environment mode | `production` |
| `ALLOWED_ORIGINS` | **Yes (Prod)** | Comma-separated list of allowed frontend origins | `https://payment.example.com` |

#### Razorpay Configuration (if PAYMENT_PROVIDER=razorpay)

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `RAZORPAY_KEY_ID` | **Yes** | Razorpay API Key ID | [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | **Yes** | Razorpay API Secret | Same as above |

#### PineLabs Configuration (if PAYMENT_PROVIDER=pinelabs)

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `PINELABS_MERCHANT_ID` | **Yes** | PineLabs merchant ID | PineLabs merchant account |
| `PINELABS_ACCESS_CODE` | **Yes** | PineLabs access code | PineLabs merchant account |
| `PINELABS_SECRET_KEY` | **Yes** | PineLabs secret key | PineLabs merchant account |
| `PINELABS_API_URL` | No | PineLabs API endpoint | `https://api.pluralonline.com` |

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | **Yes** | Backend API base URL (no trailing slash) | `https://api.example.com` |

### Example Configuration Files

**Backend .env (Production with Razorpay):**
```bash
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_1234567890abcd
RAZORPAY_KEY_SECRET=your_production_secret_key
ALLOWED_ORIGINS=https://payment.example.com,https://app.example.com
```

**Frontend .env (Production):**
```bash
VITE_API_BASE_URL=https://api.example.com
```


---

## Provider Configuration

### Razorpay Setup

#### 1. Create Razorpay Account

1. Visit [Razorpay](https://razorpay.com) and sign up
2. Complete KYC verification for production access
3. Navigate to Settings → API Keys

#### 2. Generate API Keys

1. In Razorpay Dashboard, go to **Settings** → **API Keys**
2. Click **Generate Key** (or use existing keys)
3. Copy the **Key ID** (starts with `rzp_test_` or `rzp_live_`)
4. Copy the **Key Secret** (keep this secure!)

#### 3. Configure Webhooks

1. Go to **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Enter webhook URL: `https://your-backend-domain.com/api/webhook/razorpay`
4. Select events to listen for:
   - `payment.captured`
   - `payment.failed`
5. Copy the **Webhook Secret** (optional, for additional security)
6. Save the webhook

#### 4. Test Mode vs Live Mode

- **Test Mode**: Use `rzp_test_` keys for development
- **Live Mode**: Use `rzp_live_` keys for production
- Switch between modes in Razorpay Dashboard (top-left toggle)

### PineLabs Setup

#### 1. Create PineLabs Account

1. Contact PineLabs sales team for merchant account
2. Complete merchant onboarding process
3. Receive merchant credentials

#### 2. Obtain API Credentials

1. Log in to PineLabs merchant portal
2. Navigate to API Settings or Developer Settings
3. Copy the following credentials:
   - **Merchant ID**
   - **Access Code**
   - **Secret Key**

#### 3. Configure Webhooks

1. In PineLabs merchant portal, go to Webhook Settings
2. Add webhook URL: `https://your-backend-domain.com/api/webhook/pinelabs`
3. Select payment status events
4. Save configuration

#### 4. API Endpoint Configuration

- **Production**: `https://api.pluralonline.com`
- **Sandbox**: Contact PineLabs for sandbox URL


---

## Deployment Options

### Option 1: Docker Deployment (Recommended)

Docker provides the easiest and most consistent deployment experience.

#### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- 5GB disk space

#### Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd vibgyor-payment-gateway
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Build and start services:**
   ```bash
   docker-compose up --build -d
   ```

4. **Verify deployment:**
   ```bash
   # Check backend health
   curl http://localhost:3000/health
   
   # Check frontend health
   curl http://localhost:8080/health
   ```

5. **View logs:**
   ```bash
   docker-compose logs -f
   ```

For detailed Docker instructions, see [DOCKER.md](DOCKER.md).

### Option 2: Manual Deployment

#### Backend Deployment

1. **Install Node.js 18+ and npm**

2. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

3. **Install dependencies:**
   ```bash
   npm install --production
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

5. **Build TypeScript:**
   ```bash
   npm run build
   ```

6. **Start the server:**
   ```bash
   npm start
   ```

   Or use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name vibgyor-backend
   pm2 save
   pm2 startup
   ```


#### Frontend Deployment

1. **Install Node.js 18+ and npm**

2. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with backend API URL
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

6. **Serve with Nginx:**

   Install Nginx:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install nginx
   
   # CentOS/RHEL
   sudo yum install nginx
   ```

   Create Nginx configuration (`/etc/nginx/sites-available/vibgyor-frontend`):
   ```nginx
   server {
       listen 80;
       server_name payment.example.com;
       
       root /path/to/frontend/dist;
       index index.html;
       
       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       
       # Gzip compression
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
       
       # SPA routing
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # Cache static assets
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

   Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/vibgyor-frontend /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Option 3: Cloud Platform Deployment

#### AWS Deployment

**Backend (Elastic Beanstalk):**
1. Install AWS CLI and EB CLI
2. Initialize Elastic Beanstalk:
   ```bash
   cd backend
   eb init -p node.js-18 vibgyor-backend
   ```
3. Create environment:
   ```bash
   eb create vibgyor-backend-prod
   ```
4. Set environment variables:
   ```bash
   eb setenv PAYMENT_PROVIDER=razorpay RAZORPAY_KEY_ID=xxx ...
   ```
5. Deploy:
   ```bash
   eb deploy
   ```

**Frontend (S3 + CloudFront):**
1. Build frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Create S3 bucket and enable static website hosting
3. Upload dist/ contents to S3
4. Create CloudFront distribution pointing to S3 bucket
5. Configure custom domain and SSL certificate


#### Heroku Deployment

**Backend:**
1. Install Heroku CLI
2. Create Heroku app:
   ```bash
   cd backend
   heroku create vibgyor-backend
   ```
3. Set environment variables:
   ```bash
   heroku config:set PAYMENT_PROVIDER=razorpay
   heroku config:set RAZORPAY_KEY_ID=xxx
   heroku config:set RAZORPAY_KEY_SECRET=xxx
   ```
4. Deploy:
   ```bash
   git push heroku main
   ```

**Frontend:**
1. Create Heroku app:
   ```bash
   cd frontend
   heroku create vibgyor-frontend
   ```
2. Add buildpack:
   ```bash
   heroku buildpacks:set heroku/nodejs
   ```
3. Set environment variables:
   ```bash
   heroku config:set VITE_API_BASE_URL=https://vibgyor-backend.herokuapp.com
   ```
4. Deploy:
   ```bash
   git push heroku main
   ```

---

## Testing Procedures

### Pre-Deployment Testing

#### 1. Unit and Property Tests

Run all tests before deployment:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

Ensure all tests pass with 100% success rate.

#### 2. Integration Testing

Test the complete payment flow:

1. Start both services (Docker or manual)
2. Access frontend: `http://localhost:8080`
3. Add test pricing data via URL parameter (see External Site Integration)
4. Select a plan and initiate payment
5. Complete payment using test credentials
6. Verify subscription is created
7. Verify redirect back to external site

#### 3. Security Testing

- Verify HTTPS enforcement in production
- Test CORS configuration
- Verify webhook signature validation
- Test input sanitization
- Check for exposed secrets in frontend bundle


### Post-Deployment Testing

#### 1. Health Checks

```bash
# Backend health check
curl https://api.example.com/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}

# Frontend health check
curl https://payment.example.com/health

# Expected response:
# {"status":"ok"}
```

#### 2. API Endpoint Testing

Test payment initiation:
```bash
curl -X POST https://api.example.com/api/payment/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "basic",
    "amount": 999,
    "billingCycle": "monthly"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "orderId": "order_xxx",
    "amount": 999,
    "currency": "INR",
    "provider": "razorpay",
    "providerKey": "rzp_live_xxx"
  }
}
```

#### 3. Webhook Testing

Test webhook endpoint with provider's test webhook:

**Razorpay:**
1. Go to Razorpay Dashboard → Webhooks
2. Click "Test Webhook"
3. Select `payment.captured` event
4. Verify webhook is received and processed

**PineLabs:**
1. Use PineLabs test webhook tool
2. Send test payment notification
3. Verify webhook processing

#### 4. End-to-End Flow Testing

1. Create a test external site page
2. Redirect to payment gateway with test data
3. Complete payment with test card
4. Verify redirect back with subscription details
5. Check backend logs for subscription creation

### Load Testing

Use tools like Apache Bench or k6 to test performance:

```bash
# Test payment initiation endpoint
ab -n 1000 -c 10 -p payload.json -T application/json \
  https://api.example.com/api/payment/initiate
```

Target metrics:
- Response time: < 500ms (p95)
- Throughput: > 100 requests/second
- Error rate: < 0.1%


---

## External Site Integration

External websites can integrate with the Vibgyor Payment Gateway to offer subscription purchases.

### Integration Methods

#### Method 1: URL Parameter (Recommended for Testing)

Redirect users to the payment gateway with pricing data in URL parameter:

```javascript
// External site code
const pricingData = {
  plans: [
    {
      plan_id: "basic",
      name: "Basic Plan",
      monthly_amount: 999,
      annual_amount: 9990,
      features: [
        "10 GB Storage",
        "Basic Support",
        "1 User"
      ]
    },
    {
      plan_id: "pro",
      name: "Professional Plan",
      monthly_amount: 2999,
      annual_amount: 29990,
      features: [
        "100 GB Storage",
        "Priority Support",
        "5 Users",
        "Advanced Analytics"
      ]
    },
    {
      plan_id: "enterprise",
      name: "Enterprise Plan",
      monthly_amount: 5999,
      annual_amount: 59990,
      features: [
        "Unlimited Storage",
        "24/7 Support",
        "Unlimited Users",
        "Custom Integrations",
        "Dedicated Account Manager"
      ]
    }
  ],
  redirect_url: "https://example.com/payment-callback"
};

// Encode and redirect
const encodedData = encodeURIComponent(JSON.stringify(pricingData));
const paymentGatewayUrl = `https://payment.example.com?data=${encodedData}`;
window.location.href = paymentGatewayUrl;
```

#### Method 2: POST Request (Production Recommended)

For production, use a server-side POST request to avoid URL length limitations:

```javascript
// External site backend (Node.js example)
const express = require('express');
const app = express();

app.post('/initiate-payment', (req, res) => {
  const pricingData = {
    plans: [...], // Your pricing plans
    redirect_url: "https://example.com/payment-callback"
  };
  
  // Render a form that auto-submits to payment gateway
  res.send(`
    <html>
      <body>
        <form id="paymentForm" method="POST" action="https://payment.example.com">
          <input type="hidden" name="data" value='${JSON.stringify(pricingData)}' />
        </form>
        <script>
          document.getElementById('paymentForm').submit();
        </script>
      </body>
    </html>
  `);
});
```


### JSON Data Format

The pricing data must follow this exact structure:

```json
{
  "plans": [
    {
      "plan_id": "string (required, unique identifier)",
      "name": "string (required, display name)",
      "monthly_amount": "number (required, amount in smallest currency unit, e.g., paise)",
      "annual_amount": "number (required, amount in smallest currency unit)",
      "features": ["array of strings (required, feature list)"]
    }
  ],
  "redirect_url": "string (required, callback URL for your site)"
}
```

**Important Notes:**
- Must include exactly 3 pricing plans
- Amounts are in smallest currency unit (e.g., 999 = ₹9.99)
- `redirect_url` is where users return after payment
- All fields are required

### Handling Payment Callbacks

After payment completion, users are redirected back to your `redirect_url` with query parameters:

#### Success Callback

```
https://example.com/payment-callback?subscription_id=uuid&amount=999&subscription_plan_id=basic
```

Query parameters:
- `subscription_id`: Unique UUID for the subscription
- `amount`: Payment amount (in smallest currency unit)
- `subscription_plan_id`: The plan ID that was purchased

Example handler:
```javascript
// External site callback handler
app.get('/payment-callback', (req, res) => {
  const { subscription_id, amount, subscription_plan_id } = req.query;
  
  if (subscription_id && amount && subscription_plan_id) {
    // Payment successful
    // Store subscription in your database
    // Grant user access to the plan
    res.send('Payment successful! Your subscription is now active.');
  } else if (req.query.error) {
    // Payment failed
    res.send(`Payment failed: ${req.query.error}`);
  } else if (req.query.contact_request === 'true') {
    // User clicked contact button for custom pricing
    res.send('Thank you for your interest! Our team will contact you soon.');
  }
});
```

#### Failure Callback

```
https://example.com/payment-callback?error=Payment%20failed
```

Query parameters:
- `error`: Error message describing the failure

#### Contact Request Callback

```
https://example.com/payment-callback?contact_request=true
```

Query parameters:
- `contact_request`: Set to "true" when user clicks custom pricing contact button


### Complete Integration Example

Here's a complete example of external site integration:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My SaaS - Pricing</title>
</head>
<body>
  <h1>Choose Your Plan</h1>
  <button onclick="redirectToPaymentGateway()">View Pricing Plans</button>

  <script>
    function redirectToPaymentGateway() {
      const pricingData = {
        plans: [
          {
            plan_id: "starter",
            name: "Starter",
            monthly_amount: 999,
            annual_amount: 9990,
            features: [
              "10 Projects",
              "5 GB Storage",
              "Email Support"
            ]
          },
          {
            plan_id: "professional",
            name: "Professional",
            monthly_amount: 2999,
            annual_amount: 29990,
            features: [
              "Unlimited Projects",
              "50 GB Storage",
              "Priority Support",
              "Advanced Analytics"
            ]
          },
          {
            plan_id: "business",
            name: "Business",
            monthly_amount: 5999,
            annual_amount: 59990,
            features: [
              "Everything in Professional",
              "500 GB Storage",
              "24/7 Phone Support",
              "Custom Integrations",
              "SLA Guarantee"
            ]
          }
        ],
        redirect_url: window.location.origin + "/payment-callback"
      };

      const encodedData = encodeURIComponent(JSON.stringify(pricingData));
      const paymentGatewayUrl = `https://payment.example.com?data=${encodedData}`;
      window.location.href = paymentGatewayUrl;
    }
  </script>
</body>
</html>
```

Callback handler:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Payment Result</title>
</head>
<body>
  <div id="result"></div>

  <script>
    const params = new URLSearchParams(window.location.search);
    const resultDiv = document.getElementById('result');

    if (params.get('subscription_id')) {
      // Success
      resultDiv.innerHTML = `
        <h1>Payment Successful!</h1>
        <p>Subscription ID: ${params.get('subscription_id')}</p>
        <p>Plan: ${params.get('subscription_plan_id')}</p>
        <p>Amount: ₹${(params.get('amount') / 100).toFixed(2)}</p>
        <a href="/dashboard">Go to Dashboard</a>
      `;
    } else if (params.get('error')) {
      // Failure
      resultDiv.innerHTML = `
        <h1>Payment Failed</h1>
        <p>Error: ${params.get('error')}</p>
        <a href="/pricing">Try Again</a>
      `;
    } else if (params.get('contact_request') === 'true') {
      // Contact request
      resultDiv.innerHTML = `
        <h1>Thank You!</h1>
        <p>Our team will contact you shortly about custom pricing.</p>
        <a href="/">Back to Home</a>
      `;
    }
  </script>
</body>
</html>
```


---

## Postman Testing

Use Postman to test the payment gateway API endpoints directly.

### Setup Postman Collection

#### 1. Create New Collection

1. Open Postman
2. Click "New" → "Collection"
3. Name it "Vibgyor Payment Gateway"

#### 2. Set Collection Variables

Add these variables to your collection:
- `base_url`: `http://localhost:3000` (or your deployed URL)
- `razorpay_key_id`: Your Razorpay key ID
- `razorpay_key_secret`: Your Razorpay secret

### API Endpoints

#### 1. Health Check

**Request:**
```
GET {{base_url}}/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 2. Initiate Payment

**Request:**
```
POST {{base_url}}/api/payment/initiate
Content-Type: application/json

{
  "planId": "basic",
  "amount": 999,
  "billingCycle": "monthly"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_xxx",
    "amount": 999,
    "currency": "INR",
    "provider": "razorpay",
    "providerKey": "rzp_test_xxx"
  }
}
```

**Test Cases:**
- Valid payment initiation
- Invalid amount (negative, zero)
- Missing required fields
- Invalid billing cycle


#### 3. Verify Payment (Razorpay)

**Request:**
```
POST {{base_url}}/api/payment/verify
Content-Type: application/json

{
  "orderId": "order_xxx",
  "paymentId": "pay_xxx",
  "signature": "generated_signature",
  "planId": "basic",
  "amount": 999
}
```

**Generating Test Signature:**

Use this Node.js script or Postman pre-request script:
```javascript
const crypto = require('crypto');

const orderId = 'order_xxx';
const paymentId = 'pay_xxx';
const secret = 'your_razorpay_secret';

const body = `${orderId}|${paymentId}`;
const signature = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

console.log('Signature:', signature);
```

**Expected Response:**
```json
{
  "success": true,
  "subscriptionId": "uuid-v4-here",
  "amount": 999,
  "planId": "basic"
}
```

**Test Cases:**
- Valid signature verification
- Invalid signature (should return 401)
- Missing fields
- Duplicate payment verification

#### 4. Razorpay Webhook

**Request:**
```
POST {{base_url}}/api/webhook/razorpay
Content-Type: application/json
X-Razorpay-Signature: generated_webhook_signature

{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_xxx",
        "order_id": "order_xxx",
        "amount": 999,
        "status": "captured",
        "notes": {
          "planId": "basic"
        }
      }
    }
  }
}
```

**Generating Webhook Signature:**
```javascript
const crypto = require('crypto');

const webhookBody = JSON.stringify(requestBody);
const webhookSecret = 'your_webhook_secret_or_key_secret';

const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(webhookBody)
  .digest('hex');

console.log('Webhook Signature:', signature);
```

**Expected Response:**
```json
{
  "success": true
}
```

**Test Cases:**
- Valid webhook with correct signature
- Invalid signature (should return 401)
- Duplicate webhook (should be idempotent)
- Different event types


#### 5. PineLabs Webhook

**Request:**
```
POST {{base_url}}/api/webhook/pinelabs
Content-Type: application/json
X-PineLabs-Signature: generated_signature

{
  "order_id": "order_xxx",
  "payment_id": "pay_xxx",
  "amount": 999,
  "status": "success",
  "plan_id": "basic"
}
```

**Expected Response:**
```json
{
  "success": true
}
```

### Postman Collection JSON

Save this as a Postman collection:

```json
{
  "info": {
    "name": "Vibgyor Payment Gateway",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{base_url}}/health",
          "host": ["{{base_url}}"],
          "path": ["health"]
        }
      }
    },
    {
      "name": "Initiate Payment",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"planId\": \"basic\",\n  \"amount\": 999,\n  \"billingCycle\": \"monthly\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/payment/initiate",
          "host": ["{{base_url}}"],
          "path": ["api", "payment", "initiate"]
        }
      }
    },
    {
      "name": "Verify Payment",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"orderId\": \"order_xxx\",\n  \"paymentId\": \"pay_xxx\",\n  \"signature\": \"signature_here\",\n  \"planId\": \"basic\",\n  \"amount\": 999\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/payment/verify",
          "host": ["{{base_url}}"],
          "path": ["api", "payment", "verify"]
        }
      }
    }
  ]
}
```

### Testing Frontend with Postman

While Postman is primarily for API testing, you can test the frontend integration:

1. **Generate Test URL:**
   ```javascript
   const pricingData = {
     plans: [...],
     redirect_url: "https://example.com/callback"
   };
   const encodedData = encodeURIComponent(JSON.stringify(pricingData));
   const url = `http://localhost:8080?data=${encodedData}`;
   console.log(url);
   ```

2. **Open in Browser:**
   Copy the generated URL and open in browser to test the frontend


---

## Monitoring and Maintenance

### Application Monitoring

#### Health Checks

Set up automated health checks:

```bash
# Cron job to check health every 5 minutes
*/5 * * * * curl -f https://api.example.com/health || echo "Backend down" | mail -s "Alert" admin@example.com
```

#### Logging

**Backend Logging:**
- Application logs: `console.log` statements
- Error logs: `console.error` statements
- Access logs: Use morgan middleware

Configure log levels via `LOG_LEVEL` environment variable:
- `error`: Only errors
- `warn`: Warnings and errors
- `info`: General information (default)
- `debug`: Detailed debugging information

**Log Aggregation:**
- Use services like Loggly, Papertrail, or CloudWatch
- Configure log rotation to prevent disk space issues

#### Performance Monitoring

Use APM tools:
- **New Relic**: Application performance monitoring
- **Datadog**: Infrastructure and application monitoring
- **Sentry**: Error tracking and monitoring

Example Sentry integration:
```javascript
// backend/src/index.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Database Backup

If using persistent storage for subscriptions:

```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup database
pg_dump vibgyor_db > $BACKUP_DIR/vibgyor_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "vibgyor_*.sql" -mtime +7 -delete
```

### Security Updates

Regularly update dependencies:

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### SSL Certificate Renewal

If using Let's Encrypt:

```bash
# Auto-renewal with certbot
sudo certbot renew --dry-run

# Set up cron job for automatic renewal
0 0 * * * certbot renew --quiet
```


### Scaling Considerations

#### Horizontal Scaling

**Backend:**
- Deploy multiple instances behind a load balancer
- Use session-less architecture (stateless API)
- Share subscription data via database or Redis

**Frontend:**
- Serve from CDN (CloudFront, Cloudflare)
- Enable caching for static assets
- Use multiple edge locations

#### Load Balancer Configuration

Example Nginx load balancer:
```nginx
upstream backend {
    least_conn;
    server backend1.example.com:3000;
    server backend2.example.com:3000;
    server backend3.example.com:3000;
}

server {
    listen 443 ssl;
    server_name api.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Database Scaling

For production with high traffic:
- Use PostgreSQL or MongoDB for subscription storage
- Implement connection pooling
- Add read replicas for read-heavy workloads
- Consider caching with Redis

---

## Troubleshooting

### Common Issues

#### 1. Backend Won't Start

**Symptom:** Backend fails to start with error message

**Possible Causes:**
- Missing or invalid environment variables
- Port already in use
- Invalid payment provider credentials

**Solutions:**
```bash
# Check environment variables
cat backend/.env

# Verify PAYMENT_PROVIDER is set
echo $PAYMENT_PROVIDER

# Check if port is in use
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Test with different port
PORT=3001 npm start
```

#### 2. CORS Errors

**Symptom:** Frontend shows CORS errors in browser console

**Possible Causes:**
- Frontend origin not in ALLOWED_ORIGINS
- Missing CORS headers

**Solutions:**
```bash
# Update backend .env
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:5173

# Restart backend
docker-compose restart backend
```


#### 3. Payment Initiation Fails

**Symptom:** Payment initiation returns error

**Possible Causes:**
- Invalid payment provider credentials
- Provider API is down
- Network connectivity issues

**Solutions:**
```bash
# Verify credentials
echo $RAZORPAY_KEY_ID
echo $RAZORPAY_KEY_SECRET

# Test provider API directly
curl https://api.razorpay.com/v1/orders \
  -u $RAZORPAY_KEY_ID:$RAZORPAY_KEY_SECRET \
  -d amount=100 \
  -d currency=INR

# Check backend logs
docker-compose logs backend
```

#### 4. Webhook Not Received

**Symptom:** Payments complete but webhooks don't trigger

**Possible Causes:**
- Webhook URL not configured in provider dashboard
- Firewall blocking webhook requests
- Invalid webhook signature

**Solutions:**
1. Verify webhook URL in provider dashboard
2. Check firewall rules allow incoming requests
3. Test webhook manually with Postman
4. Check backend logs for webhook errors

```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhook/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: test" \
  -d '{"event":"payment.captured","payload":{}}'
```

#### 5. Frontend Shows "No Pricing Data"

**Symptom:** Frontend displays error about missing pricing data

**Possible Causes:**
- Invalid JSON format
- Missing required fields
- URL parameter not properly encoded

**Solutions:**
```javascript
// Verify JSON structure
const data = {
  plans: [/* exactly 3 plans */],
  redirect_url: "https://example.com/callback"
};

// Properly encode
const encoded = encodeURIComponent(JSON.stringify(data));
console.log(encoded);

// Test URL
const url = `http://localhost:8080?data=${encoded}`;
```

#### 6. Docker Container Exits Immediately

**Symptom:** Docker container starts then exits

**Possible Causes:**
- Application crash on startup
- Missing environment variables
- Port conflict

**Solutions:**
```bash
# Check container logs
docker-compose logs backend

# Run container interactively
docker-compose run backend sh

# Check environment variables in container
docker-compose exec backend env

# Rebuild without cache
docker-compose build --no-cache
```


#### 7. SSL/HTTPS Issues

**Symptom:** HTTPS not working or certificate errors

**Possible Causes:**
- Certificate expired
- Certificate not properly configured
- Mixed content (HTTP resources on HTTPS page)

**Solutions:**
```bash
# Check certificate expiry
openssl x509 -in /path/to/cert.pem -noout -dates

# Test SSL configuration
curl -vI https://api.example.com

# Renew Let's Encrypt certificate
sudo certbot renew

# Check for mixed content in frontend
# Ensure all resources use HTTPS
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Backend
LOG_LEVEL=debug npm start

# View detailed logs
docker-compose logs -f backend | grep DEBUG
```

### Getting Help

If issues persist:

1. **Check Documentation:**
   - README.md
   - DOCKER.md
   - This DEPLOYMENT.md

2. **Review Logs:**
   - Backend logs: `docker-compose logs backend`
   - Frontend logs: Browser console
   - Provider logs: Razorpay/PineLabs dashboard

3. **Test Components Individually:**
   - Test backend API with Postman
   - Test frontend in isolation
   - Test provider integration separately

4. **Contact Support:**
   - Payment provider support (Razorpay/PineLabs)
   - Infrastructure provider support (AWS/Heroku/etc.)

---

## Security Checklist

Before deploying to production, verify:

- [ ] All environment variables are set correctly
- [ ] Using production payment provider credentials (not test)
- [ ] HTTPS is enforced for all communications
- [ ] ALLOWED_ORIGINS is set to specific domains (not `*`)
- [ ] Webhook signatures are being verified
- [ ] No secrets are committed to version control
- [ ] No secrets are exposed in frontend bundle
- [ ] CORS is properly configured
- [ ] Input validation is enabled
- [ ] Rate limiting is configured (if applicable)
- [ ] SSL certificates are valid and not expiring soon
- [ ] Security headers are configured (X-Frame-Options, etc.)
- [ ] Dependencies are up to date with security patches
- [ ] Logs don't contain sensitive information
- [ ] Database credentials are secure (if using database)


## Performance Checklist

Optimize for production:

- [ ] Frontend assets are minified and bundled
- [ ] Gzip compression is enabled
- [ ] Static assets have cache headers
- [ ] CDN is configured for frontend
- [ ] Database queries are optimized (if using database)
- [ ] Connection pooling is configured
- [ ] Load balancer is configured for multiple instances
- [ ] Health checks are configured
- [ ] Monitoring and alerting are set up
- [ ] Log rotation is configured
- [ ] Backup strategy is in place

---

## Quick Reference

### URLs

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | http://localhost:8080 | https://payment.example.com |
| Backend | http://localhost:3000 | https://api.example.com |
| Backend Health | http://localhost:3000/health | https://api.example.com/health |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/payment/initiate` | POST | Create payment order |
| `/api/payment/verify` | POST | Verify payment completion |
| `/api/webhook/razorpay` | POST | Razorpay webhook handler |
| `/api/webhook/pinelabs` | POST | PineLabs webhook handler |

### Environment Variables Quick Reference

**Backend (Required):**
- `PAYMENT_PROVIDER` - razorpay or pinelabs
- `RAZORPAY_KEY_ID` - If using Razorpay
- `RAZORPAY_KEY_SECRET` - If using Razorpay
- `PINELABS_MERCHANT_ID` - If using PineLabs
- `PINELABS_ACCESS_CODE` - If using PineLabs
- `PINELABS_SECRET_KEY` - If using PineLabs
- `ALLOWED_ORIGINS` - Frontend URLs (production)

**Frontend (Required):**
- `VITE_API_BASE_URL` - Backend API URL

### Common Commands

```bash
# Docker
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose logs -f            # View logs
docker-compose restart backend    # Restart backend

# Manual
cd backend && npm start           # Start backend
cd frontend && npm run dev        # Start frontend dev
cd backend && npm test            # Run backend tests
cd frontend && npm test           # Run frontend tests

# Health checks
curl http://localhost:3000/health
curl http://localhost:8080/health
```

---

## Additional Resources

- [README.md](README.md) - Project overview and setup
- [DOCKER.md](DOCKER.md) - Detailed Docker documentation
- [Razorpay Documentation](https://razorpay.com/docs/)
- [PineLabs Documentation](https://www.pluralonline.com/documentation)
- [Express.js Documentation](https://expressjs.com/)
- [Angular Documentation](https://angular.io/docs)
- [Vite Documentation](https://vitejs.dev/)

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0

