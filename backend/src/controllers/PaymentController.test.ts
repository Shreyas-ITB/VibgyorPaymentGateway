/**
 * Payment Controller Unit Tests
 * Tests for payment initiation endpoint
 */

import request from 'supertest';
import express, { Express } from 'express';
import PaymentController from './PaymentController';

// Mock the PaymentProviderFactory
jest.mock('../factories/PaymentProviderFactory');

describe('PaymentController', () => {
  let app: Express;

  beforeEach(() => {
    // Set up Express app with the controller
    app = express();
    app.use(express.json());
    app.use('/api/payment', PaymentController);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('POST /api/payment/initiate', () => {
    it('should return 400 if planId is missing', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .send({
          amount: 1000,
          billingCycle: 'monthly'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toContain('planId is required');
    });

    it('should return 400 if planId is not a string', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .send({
          planId: 123,
          amount: 1000,
          billingCycle: 'monthly'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 if amount is missing', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .send({
          planId: 'basic',
          billingCycle: 'monthly'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toContain('amount is required');
    });

    it('should return 400 if amount is not a positive number', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .send({
          planId: 'basic',
          amount: -100,
          billingCycle: 'monthly'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 if billingCycle is missing', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .send({
          planId: 'basic',
          amount: 1000
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toContain('billingCycle is required');
    });

    it('should return 400 if billingCycle is invalid', async () => {
      const response = await request(app)
        .post('/api/payment/initiate')
        .send({
          planId: 'basic',
          amount: 1000,
          billingCycle: 'weekly'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should successfully create payment order with valid request', async () => {
      // Mock the provider
      const mockProvider = {
        createOrder: jest.fn().mockResolvedValue({
          orderId: 'order_123',
          amount: 1000,
          currency: 'INR'
        }),
        getProviderKey: jest.fn().mockReturnValue('rzp_test_key')
      };

      const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
      PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

      // Set environment variable
      process.env.PAYMENT_PROVIDER = 'razorpay';

      const response = await request(app)
        .post('/api/payment/initiate')
        .send({
          planId: 'basic',
          amount: 1000,
          billingCycle: 'monthly'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        orderId: 'order_123',
        amount: 1000,
        currency: 'INR',
        provider: 'razorpay',
        providerKey: 'rzp_test_key'
      });

      expect(mockProvider.createOrder).toHaveBeenCalledWith(
        1000,
        'INR',
        {
          planId: 'basic',
          billingCycle: 'monthly'
        }
      );
    });

    it('should handle provider errors gracefully', async () => {
      // Mock the provider to throw an error
      const mockProvider = {
        createOrder: jest.fn().mockRejectedValue(new Error('Provider API error')),
        getProviderKey: jest.fn().mockReturnValue('rzp_test_key')
      };

      const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
      PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

      process.env.PAYMENT_PROVIDER = 'razorpay';

      const response = await request(app)
        .post('/api/payment/initiate')
        .send({
          planId: 'basic',
          amount: 1000,
          billingCycle: 'monthly'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_INIT_FAILED');
      expect(response.body.error.message).toContain('Provider API error');
    });

    it('should handle factory errors when provider is not configured', async () => {
      const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
      PaymentProviderFactory.createProvider = jest.fn().mockImplementation(() => {
        throw new Error('PAYMENT_PROVIDER environment variable is not set');
      });

      const response = await request(app)
        .post('/api/payment/initiate')
        .send({
          planId: 'basic',
          amount: 1000,
          billingCycle: 'monthly'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_INIT_FAILED');
    });
  });

  describe('POST /api/payment/verify', () => {
    it('should return 400 if orderId is missing', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          paymentId: 'pay_123',
          signature: 'sig_123',
          provider: 'razorpay',
          planId: 'basic',
          amount: 1000
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toContain('orderId is required');
    });

    it('should return 400 if paymentId is missing', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          orderId: 'order_123',
          signature: 'sig_123',
          provider: 'razorpay',
          planId: 'basic',
          amount: 1000
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toContain('paymentId is required');
    });

    it('should return 400 if signature is missing', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          orderId: 'order_123',
          paymentId: 'pay_123',
          provider: 'razorpay',
          planId: 'basic',
          amount: 1000
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toContain('signature is required');
    });

    it('should return 400 if provider is missing', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          orderId: 'order_123',
          paymentId: 'pay_123',
          signature: 'sig_123',
          planId: 'basic',
          amount: 1000
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toContain('provider is required');
    });

    it('should return 400 if provider is invalid', async () => {
      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          orderId: 'order_123',
          paymentId: 'pay_123',
          signature: 'sig_123',
          provider: 'stripe',
          planId: 'basic',
          amount: 1000
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 if planId is missing', async () => {
      const mockProvider = {
        verifyPayment: jest.fn().mockResolvedValue(true)
      };

      const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
      PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          orderId: 'order_123',
          paymentId: 'pay_123',
          signature: 'sig_123',
          provider: 'razorpay',
          amount: 1000
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toContain('planId is required');
    });

    it('should return 400 if amount is missing', async () => {
      const mockProvider = {
        verifyPayment: jest.fn().mockResolvedValue(true)
      };

      const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
      PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          orderId: 'order_123',
          paymentId: 'pay_123',
          signature: 'sig_123',
          provider: 'razorpay',
          planId: 'basic'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.details).toContain('amount is required');
    });

    it('should return 401 if payment verification fails', async () => {
      const mockProvider = {
        verifyPayment: jest.fn().mockResolvedValue(false)
      };

      const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
      PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          orderId: 'order_123',
          paymentId: 'pay_123',
          signature: 'invalid_sig',
          provider: 'razorpay',
          planId: 'basic',
          amount: 1000
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_VERIFICATION_FAILED');
      expect(mockProvider.verifyPayment).toHaveBeenCalledWith('order_123', 'pay_123', 'invalid_sig');
    });

    it('should successfully verify payment and create subscription', async () => {
      const mockProvider = {
        verifyPayment: jest.fn().mockResolvedValue(true)
      };

      const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
      PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          orderId: 'order_123',
          paymentId: 'pay_123',
          signature: 'valid_sig',
          provider: 'razorpay',
          planId: 'basic',
          amount: 1000
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.subscriptionId).toBeDefined();
      expect(response.body.amount).toBe(1000);
      expect(response.body.planId).toBe('basic');
      expect(mockProvider.verifyPayment).toHaveBeenCalledWith('order_123', 'pay_123', 'valid_sig');
    });

    it('should handle provider errors during verification', async () => {
      const mockProvider = {
        verifyPayment: jest.fn().mockRejectedValue(new Error('Verification API error'))
      };

      const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
      PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

      const response = await request(app)
        .post('/api/payment/verify')
        .send({
          orderId: 'order_123',
          paymentId: 'pay_123',
          signature: 'sig_123',
          provider: 'razorpay',
          planId: 'basic',
          amount: 1000
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_VERIFICATION_FAILED');
    });
  });
});
