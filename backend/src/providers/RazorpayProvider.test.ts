/**
 * Unit tests for RazorpayProvider
 */

import { RazorpayProvider } from './RazorpayProvider';
import crypto from 'crypto';

// Mock the Razorpay module
const mockCreate = jest.fn();
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: mockCreate,
    },
  }));
});

describe('RazorpayProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      RAZORPAY_KEY_ID: 'test_key_id',
      RAZORPAY_KEY_SECRET: 'test_key_secret',
    };
    mockCreate.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if RAZORPAY_KEY_ID is not set', () => {
      delete process.env.RAZORPAY_KEY_ID;
      expect(() => new RazorpayProvider()).toThrow(
        'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables'
      );
    });

    it('should throw error if RAZORPAY_KEY_SECRET is not set', () => {
      delete process.env.RAZORPAY_KEY_SECRET;
      expect(() => new RazorpayProvider()).toThrow(
        'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables'
      );
    });

    it('should initialize successfully with valid credentials', () => {
      expect(() => new RazorpayProvider()).not.toThrow();
    });
  });

  describe('getProviderKey', () => {
    it('should return the Razorpay key ID', () => {
      const provider = new RazorpayProvider();
      expect(provider.getProviderKey()).toBe('test_key_id');
    });
  });

  describe('createOrder', () => {
    it('should create an order with Razorpay SDK', async () => {
      const mockOrder = {
        id: 'order_123',
        amount: 50000,
        currency: 'INR',
      };

      mockCreate.mockResolvedValue(mockOrder);

      const provider = new RazorpayProvider();
      const result = await provider.createOrder(50000, 'INR', { receipt: 'test_receipt' });

      expect(result).toEqual({
        orderId: 'order_123',
        amount: 50000,
        currency: 'INR',
      });
      expect(mockCreate).toHaveBeenCalledWith({
        amount: 50000,
        currency: 'INR',
        receipt: 'test_receipt',
        notes: {},
      });
    });

    it('should handle order creation errors', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      const provider = new RazorpayProvider();
      await expect(provider.createOrder(50000, 'INR', {})).rejects.toThrow(
        'Failed to create Razorpay order: API Error'
      );
    });
  });

  describe('verifyPayment', () => {
    it('should verify valid payment signature', async () => {
      const provider = new RazorpayProvider();
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      const body = `${orderId}|${paymentId}`;
      
      // Generate valid signature
      const validSignature = crypto
        .createHmac('sha256', 'test_key_secret')
        .update(body)
        .digest('hex');

      const result = await provider.verifyPayment(orderId, paymentId, validSignature);
      expect(result).toBe(true);
    });

    it('should reject invalid payment signature', async () => {
      const provider = new RazorpayProvider();
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      const invalidSignature = 'invalid_signature_12345';

      const result = await provider.verifyPayment(orderId, paymentId, invalidSignature);
      expect(result).toBe(false);
    });

    it('should handle signature verification errors gracefully', async () => {
      const provider = new RazorpayProvider();
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      const malformedSignature = ''; // Empty signature

      const result = await provider.verifyPayment(orderId, paymentId, malformedSignature);
      expect(result).toBe(false);
    });
  });
});
