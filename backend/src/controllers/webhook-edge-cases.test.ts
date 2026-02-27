/**
 * Edge case tests for webhook endpoints
 * Tests duplicate webhook processing and other edge cases
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

describe('Webhook Edge Cases', () => {
  describe('Duplicate webhook processing', () => {
    it('should handle duplicate Razorpay webhooks idempotently', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_duplicate_edge_test_1',
              order_id: 'order_duplicate_edge_test_1',
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

      // Send same webhook third time (multiple duplicates)
      const thirdResponse = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('x-razorpay-signature', validSignature)
        .send(webhookPayload);

      expect(thirdResponse.status).toBe(200);
      expect(thirdResponse.body.success).toBe(true);
    });

    it('should handle duplicate PineLabs webhooks idempotently', async () => {
      // Switch to PineLabs provider
      process.env.PAYMENT_PROVIDER = 'pinelabs';
      process.env.PINELABS_MERCHANT_ID = 'test_merchant_id';
      process.env.PINELABS_ACCESS_CODE = 'test_access_code';
      process.env.PINELABS_SECRET_KEY = 'test_secret_key';

      const orderId = 'pl_order_duplicate_edge_test';
      const paymentId = 'pl_pay_duplicate_edge_test';
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

      // Send same webhook third time (multiple duplicates)
      const thirdResponse = await request(app)
        .post('/api/payment/webhook/pinelabs')
        .send(webhookPayload);

      expect(thirdResponse.status).toBe(200);
      expect(thirdResponse.body.success).toBe(true);

      // Reset to Razorpay
      process.env.PAYMENT_PROVIDER = 'razorpay';
    });

    it('should handle rapid duplicate webhooks (race condition simulation)', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_race_condition_test',
              order_id: 'order_race_condition_test',
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

      // Send multiple webhooks simultaneously
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/payment/webhook/razorpay')
          .set('x-razorpay-signature', validSignature)
          .send(webhookPayload)
      );

      const responses = await Promise.all(promises);

      // All should return success
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Empty and malformed webhook data', () => {
    it('should reject empty webhook body', async () => {
      const validSignature = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update('{}')
        .digest('hex');

      const response = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('x-razorpay-signature', validSignature)
        .send({});

      // Should still return 200 to prevent retries, but won't process
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle webhook with missing payment data gracefully', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {}
      };

      const body = JSON.stringify(webhookPayload);
      const validSignature = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update(body)
        .digest('hex');

      const response = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('x-razorpay-signature', validSignature)
        .send(webhookPayload);

      // Should return 200 to prevent retries
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle PineLabs webhook with missing required fields', async () => {
      process.env.PAYMENT_PROVIDER = 'pinelabs';
      process.env.PINELABS_MERCHANT_ID = 'test_merchant_id';
      process.env.PINELABS_ACCESS_CODE = 'test_access_code';
      process.env.PINELABS_SECRET_KEY = 'test_secret_key';

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

      // Reset to Razorpay
      process.env.PAYMENT_PROVIDER = 'razorpay';
    });

    it('should handle webhook with null values', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: null,
              order_id: null,
              amount: null,
              notes: null
            }
          }
        }
      };

      const body = JSON.stringify(webhookPayload);
      const validSignature = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update(body)
        .digest('hex');

      const response = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('x-razorpay-signature', validSignature)
        .send(webhookPayload);

      // Should return 200 to prevent retries
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Invalid signature edge cases', () => {
    it('should reject webhook with empty signature', async () => {
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
        .set('x-razorpay-signature', '')
        .send(webhookPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject webhook with signature of wrong length', async () => {
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
        .set('x-razorpay-signature', 'short')
        .send(webhookPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject webhook with signature containing special characters', async () => {
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
        .set('x-razorpay-signature', 'invalid!@#$%^&*()signature')
        .send(webhookPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });
  });

  describe('Different webhook event types', () => {
    it('should ignore non-payment.captured events', async () => {
      const webhookPayload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_test',
              order_id: 'order_failed_test',
              amount: 50000,
              notes: { planId: 'basic' }
            }
          }
        }
      };

      const body = JSON.stringify(webhookPayload);
      const validSignature = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update(body)
        .digest('hex');

      const response = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('x-razorpay-signature', validSignature)
        .send(webhookPayload);

      // Should return 200 but not process the payment
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle unknown event types gracefully', async () => {
      const webhookPayload = {
        event: 'unknown.event.type',
        payload: {
          data: 'some data'
        }
      };

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
  });
});
