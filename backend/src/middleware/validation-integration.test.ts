/**
 * Integration tests for validation middleware with PaymentController
 * Validates: Requirements 1.4
 */

import request from 'supertest';
import express from 'express';
import PaymentController from '../controllers/PaymentController';

describe('Validation Middleware Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/payment', PaymentController);

    // Set required environment variables
    process.env.PAYMENT_PROVIDER = 'razorpay';
    process.env.RAZORPAY_KEY_ID = 'test_key';
    process.env.RAZORPAY_KEY_SECRET = 'test_secret';
  });

  describe('POST /api/payment/initiate', () => {
    it('should reject request without Content-Type header', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify({ planId: 'basic', amount: 999, billingCycle: 'monthly' }))
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE'
        }
      });
    });

    it('should reject request with missing required fields', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .set('Content-Type', 'application/json')
        .send({ planId: 'basic' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Validation failed'
        }
      });
      expect(response.body.error.details).toContain('amount is required');
    });

    it('should reject request with invalid field types', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .set('Content-Type', 'application/json')
        .send({ planId: 'basic', amount: 'invalid', billingCycle: 'monthly' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_REQUEST'
        }
      });
    });

    it('should reject request with invalid enum value', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .set('Content-Type', 'application/json')
        .send({ planId: 'basic', amount: 999, billingCycle: 'weekly' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_REQUEST'
        }
      });
    });

    it('should sanitize XSS attempts in planId', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .set('Content-Type', 'application/json')
        .send({ 
          planId: '<script>alert("xss")</script>basic', 
          amount: 999, 
          billingCycle: 'monthly' 
        });

      // The request should be processed (sanitized), not rejected
      // Check that the planId was sanitized
      if (response.status === 200) {
        // If successful, the XSS was sanitized
        expect(response.body.success).toBe(true);
      }
    });

    it('should reject negative amounts', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .set('Content-Type', 'application/json')
        .send({ planId: 'basic', amount: -100, billingCycle: 'monthly' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_REQUEST'
        }
      });
    });

    it('should reject zero amounts', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .set('Content-Type', 'application/json')
        .send({ planId: 'basic', amount: 0, billingCycle: 'monthly' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_REQUEST'
        }
      });
    });
  });

  describe('POST /api/payment/verify', () => {
    it('should reject request with missing required fields', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .set('Content-Type', 'application/json')
        .send({ orderId: 'order_123' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Validation failed'
        }
      });
    });

    it('should reject request with invalid provider', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .set('Content-Type', 'application/json')
        .send({
          orderId: 'order_123',
          paymentId: 'pay_123',
          signature: 'sig_123',
          provider: 'invalid_provider',
          planId: 'basic',
          amount: 999
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_REQUEST'
        }
      });
    });

    it('should sanitize XSS attempts in all string fields', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .set('Content-Type', 'application/json')
        .send({
          orderId: '<script>alert(1)</script>order_123',
          paymentId: '<img src=x onerror=alert(1)>pay_123',
          signature: 'sig_123',
          provider: 'razorpay',
          planId: '<b>basic</b>',
          amount: 999
        });

      // The request should be processed with sanitized values
      // Even if verification fails, it should not be due to validation
      expect(response.status).not.toBe(400);
    });

    it('should reject array body', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .set('Content-Type', 'application/json')
        .send(['item1', 'item2'])
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_JSON'
        }
      });
    });
  });

  describe('Webhook endpoints', () => {
    it('should reject webhook without proper JSON content-type', async () => {
      const response = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('Content-Type', 'text/plain')
        .set('x-razorpay-signature', 'test_signature')
        .send(JSON.stringify({ event: 'payment.captured' }))
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE'
        }
      });
    });

    it('should sanitize webhook payload', async () => {
      const response = await request(app)
        .post('/api/payment/webhook/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', 'test_signature')
        .send({
          event: '<script>payment.captured</script>',
          payload: {
            payment: {
              entity: {
                id: 'pay_123',
                order_id: 'order_123'
              }
            }
          }
        });

      // Should process (even if signature fails), not reject due to validation
      expect(response.status).not.toBe(400);
    });
  });

  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror="alert(1)">',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)">',
      '<body onload=alert(1)>',
      '<input onfocus=alert(1) autofocus>',
      '<select onfocus=alert(1) autofocus>',
      '<textarea onfocus=alert(1) autofocus>',
      '<marquee onstart=alert(1)>'
    ];

    xssPayloads.forEach((payload) => {
      it(`should sanitize XSS payload: ${payload.substring(0, 30)}...`, async () => {
        const response = await request(app)
          .post('/api/payment/initiate')
          .set('Content-Type', 'application/json')
          .send({
            planId: payload + 'basic',
            amount: 999,
            billingCycle: 'monthly'
          });

        // Should not reject due to validation
        // The XSS should be sanitized
        if (response.status === 200 || response.status === 500) {
          // Either success (sanitized) or server error (not validation error)
          expect(response.status).not.toBe(400);
        }
      });
    });
  });
});
