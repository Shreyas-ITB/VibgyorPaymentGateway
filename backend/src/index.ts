import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { PaymentController } from './controllers';
import { getCustomerPortalData, createOrUpdateCustomer, downloadInvoice, createRenewalOrder, verifyRenewalPayment, downloadSignedDocuments, saveDocuSealSubmissionId, downloadReceipt } from './controllers/CustomerController';
import { getAllCustomers, getCustomersByMonth, getCustomerById, updateCustomer, deleteCustomer, createCustomer, generatePaymentLink, checkPaymentStatus, testLifecycleCheck } from './controllers/AdminController';
import { getAllPlans, getPlanById, createPlan, updatePlan, deletePlan } from './controllers/PlanController';
import { getAllAddons, getAddonById, createAddon, updateAddon, deleteAddon } from './controllers/AddonController';
import { getAllSpecialOffers, getSpecialOfferById, createSpecialOffer, updateSpecialOffer, deleteSpecialOffer } from './controllers/SpecialOfferController';
import { sanitizeInput, corsMiddleware } from './middleware';
import { swaggerDocument } from './swagger';
import { SchedulerService } from './services';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibgyor-payment-gateway';

// Initialize scheduler
const scheduler = new SchedulerService();

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✓ Connected to MongoDB');
    
    // Start scheduler after DB connection
    scheduler.start();
  })
  .catch((error) => {
    console.error('✗ MongoDB connection error:', error);
    process.exit(1);
  });

// HTTPS enforcement middleware for production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    if (!isHttps) {
      res.status(403).json({
        success: false,
        error: {
          code: 'HTTPS_REQUIRED',
          message: 'HTTPS is required for all requests in production'
        }
      });
      return;
    }
    
    next();
  });
}

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(sanitizeInput);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// PDF viewing endpoint with proper headers
app.get('/uploads/documents/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/documents', filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.status(404).json({
      success: false,
      message: 'File not found'
    });
    return;
  }
  
  // Set headers for PDF viewing
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  
  // Send file
  res.sendFile(filePath);
});

// Swagger Documentation
app.get('/api-docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vibgyor Payment Gateway API</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
      <script>
        window.onload = function() {
          SwaggerUIBundle({
            spec: ${JSON.stringify(swaggerDocument)},
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIBundle.SwaggerUIStandalonePreset
            ]
          });
        };
      </script>
    </body>
    </html>
  `);
});

// Swagger JSON endpoint
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerDocument);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/payment', PaymentController);

// Webhook Routes
import { handleRazorpayWebhook } from './controllers/WebhookController';
app.post('/api/webhooks/razorpay', handleRazorpayWebhook);

// Customer Portal Routes
app.get('/api/customer/portal', getCustomerPortalData);
app.post('/api/customer/create', createOrUpdateCustomer);
app.get('/api/customer/invoice/:customerId', downloadInvoice);
app.get('/api/customer/receipt/:customerId/:paymentId', downloadReceipt);
app.post('/api/customer/save-docuseal-id/:customerId', saveDocuSealSubmissionId);
app.get('/api/customer/signed-documents/:customerId', downloadSignedDocuments);
app.post('/api/customer/renewal-order/:customerId', createRenewalOrder);
app.post('/api/customer/verify-renewal/:customerId', verifyRenewalPayment);

// Admin Routes
app.post('/api/admin/customers', createCustomer);
app.get('/api/admin/customers', getAllCustomers);
app.get('/api/admin/customers/renewals', getCustomersByMonth);
app.get('/api/admin/customers/:customerId', getCustomerById);
app.put('/api/admin/customers/:customerId', updateCustomer);
app.delete('/api/admin/customers/:customerId', deleteCustomer);
app.post('/api/admin/customers/:customerId/payment-link', generatePaymentLink);
app.post('/api/admin/customers/:customerId/check-payment', checkPaymentStatus);
app.post('/api/admin/test-lifecycle', testLifecycleCheck);


// Plan Management Routes
app.get('/api/admin/plans', getAllPlans);
app.get('/api/admin/plans/:id', getPlanById);
app.post('/api/admin/plans', createPlan);
app.put('/api/admin/plans/:id', updatePlan);
app.delete('/api/admin/plans/:id', deletePlan);

// Addon Management Routes
app.get('/api/admin/addons', getAllAddons);
app.get('/api/admin/addons/:id', getAddonById);
app.post('/api/admin/addons', createAddon);
app.put('/api/admin/addons/:id', updateAddon);
app.delete('/api/admin/addons/:id', deleteAddon);

// Special Offer Management Routes
app.get('/api/admin/special-offers', getAllSpecialOffers);
app.get('/api/admin/special-offers/:id', getSpecialOfferById);
app.post('/api/admin/special-offers', createSpecialOffer);
app.put('/api/admin/special-offers/:id', updateSpecialOffer);
app.delete('/api/admin/special-offers/:id', deleteSpecialOffer);

// Reminder System Routes (for testing)
app.post('/api/admin/reminders/check-now', async (_req, res) => {
  try {
    await scheduler.runLifecycleCheckNow();
    res.json({ success: true, message: 'Lifecycle check completed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to run reminder check', error: (error as Error).message });
  }
});

app.post('/api/admin/reminders/test/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { days } = req.body;
    
    if (!days || ![10, 5, 2].includes(days)) {
      res.status(400).json({ success: false, message: 'Days must be 10, 5, or 2' });
      return;
    }

    // Use EmailService directly for test reminders
    const { EmailService } = require('./services');
    const Customer = require('./models/Customer').default;
    
    const customer = await Customer.findOne({ customerId });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }
    
    const emailService = new EmailService();
    await emailService.sendPaymentReminder(customer, days);
    
    res.json({ success: true, message: `Test reminder sent for ${days} days` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send test reminder', error: (error as Error).message });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Vibgyor Payment Gateway Backend running on port ${PORT}`);
  console.log(`✓ Payment Provider: ${process.env.PAYMENT_PROVIDER || 'NOT SET'}`);
  console.log(`✓ API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`✓ Health Check: http://localhost:${PORT}/health`);
  console.log(`✓ DocuSeal API Key: ${process.env.DOCUSEAL_API_KEY ? 'CONFIGURED (' + process.env.DOCUSEAL_API_KEY.substring(0, 10) + '...)' : 'NOT CONFIGURED'}`);
  console.log(`✓ DocuSeal API URL: ${process.env.DOCUSEAL_API_URL || 'NOT SET'}`);
});

export default app;
