# Vibgyor Payment Gateway

A comprehensive payment gateway solution with subscription management, invoice generation, e-signature integration, and multi-provider payment processing. Built with Node.js/Express backend and Angular frontend.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Seeding](#database-seeding)
- [Docker Deployment](#docker-deployment)
- [Testing](#testing)

## 🎯 Overview

Vibgyor Payment Gateway is a full-stack payment processing platform designed for subscription-based services. It provides:

- **Multi-Provider Support**: Seamlessly switch between Razorpay and PineLabs payment providers
- **Subscription Management**: Handle customer subscriptions with plans, add-ons, and special offers
- **Invoice & Receipt Generation**: Automated PDF generation for invoices and payment receipts
- **E-Signature Integration**: DocuSeal integration for document signing
- **Payment Reminders**: Automated email reminders for upcoming renewals
- **Admin Dashboard**: Comprehensive admin interface for managing customers, payments, and subscriptions
- **Customer Portal**: Self-service portal for customers to view subscriptions and download documents

## ✨ Features

### Backend Features

- **Payment Processing**
  - Support for Razorpay and PineLabs payment gateways
  - Payment verification and webhook handling
  - Renewal order creation and processing
  - Payment status tracking

- **Subscription Management**
  - Customer subscription lifecycle management
  - Plan and add-on management
  - Special offers and discounts
  - Automatic renewal handling

- **Document Management**
  - PDF invoice generation with company details
  - Payment receipt generation
  - DocuSeal e-signature integration
  - Document download and viewing

- **Communication**
  - Email-based payment reminders (10, 5, and 2 days before renewal)
  - Automated email notifications
  - Customizable email templates

- **Admin Features**
  - Customer CRUD operations
  - Payment link generation
  - Payment status checking
  - Lifecycle event testing
  - Bulk customer management

- **Security**
  - HTTPS enforcement in production
  - CORS middleware with configurable origins
  - Input sanitization and validation
  - Webhook signature verification
  - Environment-based configuration

- **API Documentation**
  - Swagger/OpenAPI documentation
  - Interactive API explorer at `/api-docs`
  - Health check endpoint

### Frontend Features

- **Authentication**
  - Admin login with credentials
  - Session management
  - Protected routes

- **Admin Dashboard**
  - Customer management interface
  - Payment monitoring
  - Subscription overview
  - Analytics and charts

- **Customer Portal**
  - Subscription details view
  - Invoice and receipt download
  - Document signing via DocuSeal
  - Renewal order creation
  - Payment history

- **Calendar View**
  - Renewal schedule visualization
  - Upcoming payment tracking

- **Responsive Design**
  - Tailwind CSS styling
  - Mobile-friendly interface
  - Chart.js integration for analytics

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Payment Providers**: Razorpay SDK, PineLabs API
- **Document Generation**: PDFKit
- **Email**: Nodemailer (Gmail SMTP)
- **E-Signature**: DocuSeal API
- **Scheduling**: node-cron
- **Testing**: Jest, Supertest, fast-check (property-based testing)
- **Validation**: Validator.js, DOMPurify

### Frontend
- **Framework**: Angular 17
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite with Angular plugin
- **Charts**: Chart.js with ng2-charts
- **E-Signature**: DocuSeal Angular SDK
- **HTTP Client**: Angular HttpClient
- **Testing**: Jest

## 📁 Project Structure

```
vibgyor-payment-gateway/
├── backend/
│   ├── src/
│   │   ├── controllers/          # Route handlers
│   │   ├── models/               # MongoDB schemas
│   │   ├── services/             # Business logic
│   │   ├── providers/            # Payment provider implementations
│   │   ├── factories/            # Factory patterns
│   │   ├── middleware/           # Express middleware
│   │   ├── interfaces/           # TypeScript interfaces
│   │   ├── scripts/              # Database seeding scripts
│   │   ├── index.ts              # Application entry point
│   │   └── swagger.ts            # API documentation
│   ├── invoices/                 # Generated invoice PDFs
│   ├── receipts/                 # Generated receipt PDFs
│   ├── .env                      # Environment variables
│   ├── .env.example              # Environment template
│   ├── package.json              # Dependencies
│   ├── tsconfig.json             # TypeScript config
│   ├── jest.config.js            # Jest testing config
│   └── Dockerfile                # Docker configuration
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/            # Page components
│   │   │   │   ├── login/        # Admin login
│   │   │   │   ├── dashboard/    # Admin dashboard
│   │   │   │   ├── customer-portal/  # Customer portal
│   │   │   │   ├── calendar/     # Renewal calendar
│   │   │   │   └── documents/    # Document management
│   │   │   ├── services/         # HTTP services
│   │   │   ├── guards/           # Route guards
│   │   │   ├── app.routes.ts     # Route configuration
│   │   │   └── app.component.ts  # Root component
│   │   ├── environments/         # Environment configs
│   │   ├── styles.css            # Global styles
│   │   └── main.ts               # Application bootstrap
│   ├── .env                      # Environment variables
│   ├── .env.example              # Environment template
│   ├── angular.json              # Angular CLI config
│   ├── package.json              # Dependencies
│   ├── tsconfig.json             # TypeScript config
│   ├── tailwind.config.js        # Tailwind configuration
│   ├── Dockerfile                # Docker configuration
│   └── vite.config.ts            # Vite configuration
│
└── README.md                     # This file
```

## 📦 Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: v5.0 or higher (local or Atlas)
- **Git**: For version control

### Required Accounts & Credentials
1. **Payment Provider** (choose one):
   - Razorpay account with API keys
   - PineLabs merchant account with credentials

2. **Email Service**:
   - Gmail account with App Password enabled

3. **Document Signing** (optional):
   - DocuSeal account with API key

4. **Database**:
   - MongoDB local instance or MongoDB Atlas cluster

## 🚀 Backend Setup

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables

Copy the example environment file and update with your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```dotenv
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Payment Provider (razorpay or pinelabs)
PAYMENT_PROVIDER=razorpay

# Razorpay (if using Razorpay)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# PineLabs (if using PineLabs)
PINELABS_MERCHANT_ID=your_merchant_id
PINELABS_ACCESS_CODE=your_access_code
PINELABS_SECRET_KEY=your_secret_key

# CORS
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:8000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/vibgyor-payment-gateway

# DocuSeal
DOCUSEAL_API_KEY=your_docuseal_key
DOCUSEAL_API_URL=https://api.docuseal.com

# Email (Gmail SMTP)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=Vibgyor Payment System
CUSTOMER_PORTAL_URL=http://localhost:4200/customer-portal

# Company Details
COMPANY_GST=29XXXXX1234X1ZX
COMPANY_EMAIL=billing@vibgyor.com
COMPANY_PHONE=+91 1234567890
```

### Step 3: Verify MongoDB Connection

Ensure MongoDB is running:

```bash
# For local MongoDB
mongod

# Or verify MongoDB Atlas connection string in .env
```

### Step 4: Build TypeScript

```bash
npm run build
```

## 🎨 Frontend Setup

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` if needed (optional for development):

```dotenv
EMPLOYEE_LIST_API=https://chatapi.vibgyor.co.in/admin/employees
DOCUSEAL_DOCUMENT_LINK=https://docuseal.com/d/o3mdaJdBUQcAkn
```

### Step 3: Update Admin Credentials (Optional)

To change admin login credentials, edit:
- `frontend/src/environments/environment.ts` (development)
- `frontend/src/environments/environment.prod.ts` (production)

Default credentials:
- Username: `admin`
- Password: `admin123`

## ▶️ Running the Application

### Option 1: Development Mode (Recommended)

#### Terminal 1 - Start Backend

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3000`
- API: `http://localhost:3000/api`
- Swagger Docs: `http://localhost:3000/api-docs`
- Health Check: `http://localhost:3000/health`

#### Terminal 2 - Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:4200`

### Option 2: Production Build

#### Build Backend

```bash
cd backend
npm run build
npm start
```

#### Build Frontend

```bash
cd frontend
npm run build
npm run preview
```

## 📚 API Documentation

### Interactive API Explorer

Once the backend is running, visit:
```
http://localhost:3000/api-docs
```

This provides an interactive Swagger UI where you can:
- View all available endpoints
- See request/response schemas
- Test API calls directly

### Key API Endpoints

#### Payment Routes
- `POST /api/payment/create-order` - Create payment order
- `POST /api/payment/verify` - Verify payment
- `GET /api/payment/status/:orderId` - Check payment status

#### Customer Routes
- `GET /api/customer/portal` - Get customer portal data
- `POST /api/customer/create` - Create/update customer
- `GET /api/customer/invoice/:customerId` - Download invoice
- `GET /api/customer/receipt/:customerId/:paymentId` - Download receipt
- `POST /api/customer/renewal-order/:customerId` - Create renewal order

#### Admin Routes
- `GET /api/admin/customers` - List all customers
- `POST /api/admin/customers` - Create customer
- `GET /api/admin/customers/:customerId` - Get customer details
- `PUT /api/admin/customers/:customerId` - Update customer
- `DELETE /api/admin/customers/:customerId` - Delete customer
- `POST /api/admin/customers/:customerId/payment-link` - Generate payment link

#### Plan Management
- `GET /api/admin/plans` - List plans
- `POST /api/admin/plans` - Create plan
- `PUT /api/admin/plans/:id` - Update plan
- `DELETE /api/admin/plans/:id` - Delete plan

#### Add-on Management
- `GET /api/admin/addons` - List add-ons
- `POST /api/admin/addons` - Create add-on
- `PUT /api/admin/addons/:id` - Update add-on
- `DELETE /api/admin/addons/:id` - Delete add-on

#### Special Offers
- `GET /api/admin/special-offers` - List offers
- `POST /api/admin/special-offers` - Create offer
- `PUT /api/admin/special-offers/:id` - Update offer
- `DELETE /api/admin/special-offers/:id` - Delete offer

#### Webhooks
- `POST /api/webhooks/razorpay` - Razorpay webhook handler

## 🌱 Database Seeding

### Seed Sample Customer

```bash
cd backend
npm run seed:customer
```

This creates a sample customer with subscription data for testing.

### Seed Plans, Add-ons, and Special Offers

```bash
cd backend
npm run seed:plans
```

This populates the database with:
- Sample subscription plans
- Available add-ons
- Special promotional offers

## 🐳 Docker Deployment

### Build Docker Images

#### Backend
```bash
cd backend
docker build -t vibgyor-payment-gateway-backend .
```

#### Frontend
```bash
cd frontend
docker build -t vibgyor-payment-gateway-frontend .
```

### Run with Docker Compose

Create a `docker-compose.yml` in the root directory:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/vibgyor-payment-gateway
      - NODE_ENV=production
      - PAYMENT_PROVIDER=razorpay
      - RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
      - RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}
      - ALLOWED_ORIGINS=http://localhost:8000
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "8000:80"
    depends_on:
      - backend

volumes:
  mongo_data:
```

Run with:
```bash
docker-compose up
```

## 🧪 Testing

### Backend Tests

Run all tests:
```bash
cd backend
npm test
```

Run tests in watch mode:
```bash
cd backend
npm run test:watch
```

Test coverage includes:
- Unit tests for controllers, services, and providers
- Integration tests for payment flows
- Property-based tests using fast-check
- CORS and validation middleware tests
- Webhook edge case tests
- Security tests

### Frontend Tests

Run all tests:
```bash
cd frontend
npm test
```

Run tests in watch mode:
```bash
cd frontend
npm run test:watch
```

## 🔐 Security Considerations

### Production Checklist

- [ ] Set `NODE_ENV=production` in backend
- [ ] Use HTTPS in production (enforced automatically)
- [ ] Configure `ALLOWED_ORIGINS` with specific domains (never use `*`)
- [ ] Use strong, unique API keys and secrets
- [ ] Enable MongoDB authentication and SSL/TLS
- [ ] Store `.env` file securely (never commit to version control)
- [ ] Use environment-specific credentials
- [ ] Enable webhook signature verification
- [ ] Implement rate limiting for API endpoints
- [ ] Regular security audits and dependency updates

### Environment Variables Security

- Never commit `.env` files to version control
- Use `.gitignore` to exclude `.env` files
- Rotate API keys regularly
- Use different credentials for development and production
- Store sensitive data in secure vaults (AWS Secrets Manager, HashiCorp Vault, etc.)

## 🐛 Troubleshooting

### Backend Issues

**MongoDB Connection Error**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
Solution: Ensure MongoDB is running or update `MONGODB_URI` in `.env`

**Payment Provider Not Set**
```
Error: PAYMENT_PROVIDER must be set to 'razorpay' or 'pinelabs'
```
Solution: Set `PAYMENT_PROVIDER` in `.env` file

**CORS Errors**
```
Access to XMLHttpRequest blocked by CORS policy
```
Solution: Add frontend URL to `ALLOWED_ORIGINS` in `.env`

### Frontend Issues

**Port Already in Use**
```
Port 4200 is already in use
```
Solution: Kill the process or use a different port:
```bash
ng serve --port 4300
```

**Module Not Found**
```
Cannot find module '@angular/core'
```
Solution: Run `npm install` in frontend directory

## 📝 Environment Configuration Reference

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3000 | Server port |
| NODE_ENV | No | development | Environment mode |
| PAYMENT_PROVIDER | Yes | - | razorpay or pinelabs |
| RAZORPAY_KEY_ID | Conditional | - | Razorpay public key |
| RAZORPAY_KEY_SECRET | Conditional | - | Razorpay secret key |
| MONGODB_URI | No | mongodb://localhost:27017/vibgyor-payment-gateway | Database connection |
| ALLOWED_ORIGINS | No | http://localhost:4200 | CORS allowed origins |
| DOCUSEAL_API_KEY | Yes | - | DocuSeal API key |
| SMTP_USER | Yes | - | Gmail email address |
| SMTP_PASSWORD | Yes | - | Gmail app password |

### Frontend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| EMPLOYEE_LIST_API | No | - | Employee list API endpoint |
| DOCUSEAL_DOCUMENT_LINK | No | - | DocuSeal document link |

## 📞 Support & Documentation

- **API Documentation**: `http://localhost:3000/api-docs` (when running)
- **Razorpay Docs**: https://razorpay.com/docs/
- **PineLabs Docs**: https://pinelabs.com/docs/
- **DocuSeal Docs**: https://www.docuseal.co/docs
- **Angular Docs**: https://angular.io/docs
- **MongoDB Docs**: https://docs.mongodb.com/

## 📄 License

ISC

## 👥 Contributing

Contributions are welcome. Please ensure:
- Code follows TypeScript best practices
- Tests are included for new features
- Environment variables are properly documented
- Security best practices are followed

---

**Last Updated**: March 2026
