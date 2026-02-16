# Vibgyor Payment Gateway

A full-stack payment gateway application with Angular frontend and Node.js backend that processes payments through Razorpay or PineLabs.

## Project Structure

```
vibgyor-payment-gateway/
├── frontend/          # Angular application with Vite and Tailwind CSS
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── backend/           # Node.js/Express API server
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Setup Instructions

### Option 1: Docker Setup (Recommended)

The easiest way to run the application is using Docker Compose:

1. **Prerequisites**: Install [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

2. **Configure Environment**: Create a `.env` file in the root directory:
   ```bash
   PAYMENT_PROVIDER=razorpay
   RAZORPAY_KEY_ID=rzp_test_your_key_id
   RAZORPAY_KEY_SECRET=your_secret_key
   ```

3. **Build and Run**:
   ```bash
   docker-compose up --build
   ```

4. **Access the Application**:
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000

For detailed Docker instructions, see [DOCKER.md](DOCKER.md).

### Option 2: Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   - Set `PAYMENT_PROVIDER` to either `razorpay` or `pinelabs`
   - Add the appropriate API keys for your chosen provider

5. Start the development server:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:3000`

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:5173`

## Environment Variables

### Backend Environment Variables

The backend requires several environment variables to be configured in a `.env` file. Copy `backend/.env.example` to `backend/.env` and configure the following variables:

#### Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | The port number on which the backend server will listen |
| `NODE_ENV` | No | `development` | Environment mode: `development`, `production`, or `test`. Enables optimizations and stricter security in production |
| `LOG_LEVEL` | No | `info` | Log verbosity level: `error`, `warn`, `info`, or `debug` |

#### Payment Provider Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PAYMENT_PROVIDER` | **Yes** | - | Payment gateway to use: `razorpay` or `pinelabs`. Application will fail to start if not set or invalid |

#### Razorpay Configuration

Required only if `PAYMENT_PROVIDER=razorpay`. Obtain credentials from [Razorpay Dashboard](https://dashboard.razorpay.com).

| Variable | Required | Description |
|----------|----------|-------------|
| `RAZORPAY_KEY_ID` | **Yes** | Your Razorpay API Key ID (public key). Format: `rzp_test_xxxxx` or `rzp_live_xxxxx` |
| `RAZORPAY_KEY_SECRET` | **Yes** | Your Razorpay API Key Secret (private key). **Keep secure** - used for payment verification and webhook validation |

#### PineLabs Configuration

Required only if `PAYMENT_PROVIDER=pinelabs`. Obtain credentials from your PineLabs merchant account.

| Variable | Required | Description |
|----------|----------|-------------|
| `PINELABS_MERCHANT_ID` | **Yes** | Your PineLabs merchant identifier |
| `PINELABS_ACCESS_CODE` | **Yes** | Your PineLabs access code for API authentication. **Keep secure** |
| `PINELABS_SECRET_KEY` | **Yes** | Your PineLabs secret key for signature verification. **Keep secure** - used for webhook validation |
| `PINELABS_API_URL` | No | `https://api.pluralonline.com` | PineLabs API endpoint. Only change if instructed by PineLabs support. **Must use HTTPS** |

#### CORS Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ALLOWED_ORIGINS` | Recommended | `*` (dev only) | Comma-separated list of allowed frontend origins. **Production must specify exact domains** (never use `*`). Examples: `http://localhost:5173,http://localhost:4200` (dev) or `https://example.com,https://app.example.com` (prod) |

### Frontend Environment Variables

The frontend requires environment variables to be configured in a `.env` file. Copy `frontend/.env.example` to `frontend/.env` and configure the following:

#### API Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | **Yes** | - | Base URL of the backend API server. **Do not include trailing slash**. Development: `http://localhost:3000`. Production: **Must use HTTPS** (e.g., `https://api.example.com`). This value is embedded in the frontend bundle at build time |

### Security Notes

- **Never commit `.env` files** to version control
- **Keep all secrets secure**: `RAZORPAY_KEY_SECRET`, `PINELABS_ACCESS_CODE`, `PINELABS_SECRET_KEY`
- **Production requirements**:
  - Always use HTTPS for `VITE_API_BASE_URL` and `PINELABS_API_URL`
  - Set `ALLOWED_ORIGINS` to specific authorized domains (never `*`)
  - Use production API keys (not test keys)
  - Set `NODE_ENV=production`

### Example Configuration

**Development Backend (.env):**
```bash
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_test_1234567890abcd
RAZORPAY_KEY_SECRET=your_test_secret_key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4200
```

**Production Backend (.env):**
```bash
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_1234567890abcd
RAZORPAY_KEY_SECRET=your_production_secret_key
ALLOWED_ORIGINS=https://payment.example.com,https://app.example.com
```

**Development Frontend (.env):**
```bash
VITE_API_BASE_URL=http://localhost:3000
```

**Production Frontend (.env):**
```bash
VITE_API_BASE_URL=https://api.example.com
```

## Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run Frontend Tests
```bash
cd frontend
npm test
```

## Technology Stack

### Frontend
- Angular 17
- Vite (build tool)
- Tailwind CSS
- TypeScript
- fast-check (property-based testing)
- Jest (testing framework)

### Backend
- Node.js
- Express.js
- TypeScript
- Razorpay SDK
- UUID
- fast-check (property-based testing)
- Jest (testing framework)

## Features

- Display pricing plans in a modern card-based interface
- Support for monthly and annual billing cycles
- Automatic light/dark theme detection
- Responsive design for mobile, tablet, and desktop
- Secure payment processing through Razorpay or PineLabs
- Payment verification and webhook handling
- Subscription ID generation and management
- **Base64 encoding support** for pricing data (see [BASE64_ENCODING_GUIDE.md](BASE64_ENCODING_GUIDE.md))
- Flexible data input: JSON object, URL-encoded JSON, or Base64 encoded JSON

## Documentation

- [Quick Start Guide](QUICK_START.md) - Get started quickly
- [Docker Setup](DOCKER.md) - Run with Docker
- [Razorpay Setup](RAZORPAY_SETUP_GUIDE.md) - Configure Razorpay
- [Base64 Encoding Guide](BASE64_ENCODING_GUIDE.md) - Complete base64 guide
- [Base64 Quick Reference](QUICK_REFERENCE_BASE64.md) - Quick examples and syntax
- [Deployment Guide](DEPLOYMENT.md) - Deploy to production
- [E2E Testing](E2E_INTEGRATION_TESTS.md) - Integration tests
- [Security Tests](SECURITY_TESTS_SUMMARY.md) - Security testing

## License

MIT
