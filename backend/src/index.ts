import express from 'express';
import dotenv from 'dotenv';
import { PaymentController } from './controllers';
import { sanitizeInput, corsMiddleware } from './middleware';
import { swaggerDocument } from './swagger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

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
});

export default app;
