/**
 * Unit tests for webhook endpoints
 * Tests webhook signature verification and rejection of invalid signatures
 */

import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import PaymentController from './PaymentController';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/payment', PaymentController);

// Mock environment variables
process.env.PAYMENT_PROVIDER = 'razorpay';
process.env.RAZORPAY_KEY_ID = 'test_key_id';
process.env.RAZORPAY_KEY_SECRET = 'test_key_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';

describe('Webhook Endpoints', () => {
  describe('POST /api/payment/webhook/razorpay', () => {
    it('should reject webhook with missing signature', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test123',
              order_id: 'order_test123',
              amount: 50000,
              notes: { planId: 'basic' }
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/payment/webhook/razorpay')
        .send(webhookPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test123',
              order_id: 'order_test123',
              amount: 50000,
              notes: { planId: 'basic' }
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('x-razorpay-signature', 'invalid_signature_12345')
        .send(webhookPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should accept webhook with valid signature', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test123',
              order_id: 'order_test123',
              amount: 50000,
              notes: { planId: 'basic' }
            }
          }
        }
      };

      // Generate valid signature
      const body = JSON.stringify(webhookPayload);
      const validSignature = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update(body)
        .digest('hex');

      const response = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('x-razorpay-signature', validSignature)
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle duplicate webhooks idempotently (Razorpay)', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_duplicate_test',
              order_id: 'order_duplicate_test',
              amount: 50000,
              notes: { planId: 'basic' }
            }
          }
        }
      };

      // Generate valid signature
      const body = JSON.stringify(webhookPayload);
      const validSignature = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update(body)
        .digest('hex');

      // Send webhook first time
      const firstResponse = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('x-razorpay-signature', validSignature)
        .send(webhookPayload);

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.success).toBe(true);

      // Send same webhook second time (duplicate)
      const secondResponse = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('x-razorpay-signature', validSignature)
        .send(webhookPayload);

      // Should return success without reprocessing
      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.success).toBe(true);
    });

    it('should not process payment when signature is invalid', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test123',
              order_id: 'order_test123',
              amount: 50000,
              notes: { planId: 'basic' }
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('x-razorpay-signature', 'definitely_invalid')
        .send(webhookPayload);

      // Should return 401 and not process the payment
      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('verification failed');
    });
  });

  describe('POST /api/payment/webhook/pinelabs', () => {
    beforeAll(() => {
      process.env.PAYMENT_PROVIDER = 'pinelabs';
      process.env.PINELABS_MERCHANT_ID = 'test_merchant_id';
      process.env.PINELABS_ACCESS_CODE = 'test_access_code';
      process.env.PINELABS_SECRET_KEY = 'test_secret_key';
    });

    it('should reject webhook with missing signature', async () => {
      const webhookPayload = {
        order_id: 'pl_order_123',
        payment_id: 'pl_pay_123',
        merchant_id: 'test_merchant_id',
        amount: 50000,
        status: 'success',
        plan_id: 'basic'
      };

      const response = await request(app)
        .post('/api/payment/webhook/pinelabs')
        .send(webhookPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        order_id: 'pl_order_123',
        payment_id: 'pl_pay_123',
        merchant_id: 'test_merchant_id',
        amount: 50000,
        status: 'success',
        plan_id: 'basic',
        signature: 'invalid_signature_12345'
      };

      const response = await request(app)
        .post('/api/payment/webhook/pinelabs')
        .send(webhookPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should accept webhook with valid signature', async () => {
      const orderId = 'pl_order_123';
      const paymentId = 'pl_pay_123';
      const merchantId = 'test_merchant_id';

      // Generate valid signature using PineLabs format
      const body = `${orderId}|${paymentId}|${merchantId}`;
      const validSignature = crypto
        .createHmac('sha256', 'test_secret_key')
        .update(body)
        .digest('hex');

      const webhookPayload = {
        order_id: orderId,
        payment_id: paymentId,
        merchant_id: merchantId,
        amount: 50000,
        status: 'success',
        plan_id: 'basic',
        signature: validSignature
      };

      const response = await request(app)
        .post('/api/payment/webhook/pinelabs')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle duplicate webhooks idempotently (PineLabs)', async () => {
      const orderId = 'pl_order_duplicate';
      const paymentId = 'pl_pay_duplicate';
      const merchantId = 'test_merchant_id';

      // Generate valid signature using PineLabs format
      const body = `${orderId}|${paymentId}|${merchantId}`;
      const validSignature = crypto
        .createHmac('sha256', 'test_secret_key')
        .update(body)
        .digest('hex');

      const webhookPayload = {
        order_id: orderId,
        payment_id: paymentId,
        merchant_id: merchantId,
        amount: 50000,
        status: 'success',
        plan_id: 'basic',
        signature: validSignature
      };

      // Send webhook first time
      const firstResponse = await request(app)
        .post('/api/payment/webhook/pinelabs')
        .send(webhookPayload);

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.success).toBe(true);

      // Send same webhook second time (duplicate)
      const secondResponse = await request(app)
        .post('/api/payment/webhook/pinelabs')
        .send(webhookPayload);

      // Should return success without reprocessing
      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.success).toBe(true);
    });

    it('should not process payment when signature is invalid', async () => {
      const webhookPayload = {
        order_id: 'pl_order_123',
        payment_id: 'pl_pay_123',
        merchant_id: 'test_merchant_id',
        amount: 50000,
        status: 'success',
        plan_id: 'basic',
        signature: 'definitely_invalid'
      };

      const response = await request(app)
        .post('/api/payment/webhook/pinelabs')
        .send(webhookPayload);

      // Should return 401 and not process the payment
      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('verification failed');
    });

    it('should reject webhook with missing required fields', async () => {
      const webhookPayload = {
        // Missing order_id and payment_id
        merchant_id: 'test_merchant_id',
        amount: 50000,
        status: 'success',
        signature: 'some_signature'
      };

      const response = await request(app)
        .post('/api/payment/webhook/pinelabs')
        .send(webhookPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Missing required webhook fields');
    });
  });
});
