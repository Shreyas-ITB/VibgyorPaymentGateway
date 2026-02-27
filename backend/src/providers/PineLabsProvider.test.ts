/**
 * Unit tests for PineLabsProvider
 */

import { PineLabsProvider } from './PineLabsProvider';
import crypto from 'crypto';

describe('PineLabsProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      PINELABS_MERCHANT_ID: 'test_merchant_123',
      PINELABS_ACCESS_CODE: 'test_access_code',
      PINELABS_SECRET_KEY: 'test_secret_key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if PINELABS_MERCHANT_ID is not set', () => {
      delete process.env.PINELABS_MERCHANT_ID;
      expect(() => new PineLabsProvider()).toThrow(
        'PINELABS_MERCHANT_ID, PINELABS_ACCESS_CODE, and PINELABS_SECRET_KEY must be set in environment variables'
      );
    });

    it('should throw error if PINELABS_ACCESS_CODE is not set', () => {
      delete process.env.PINELABS_ACCESS_CODE;
      expect(() => new PineLabsProvider()).toThrow(
        'PINELABS_MERCHANT_ID, PINELABS_ACCESS_CODE, and PINELABS_SECRET_KEY must be set in environment variables'
      );
    });

    it('should throw error if PINELABS_SECRET_KEY is not set', () => {
      delete process.env.PINELABS_SECRET_KEY;
      expect(() => new PineLabsProvider()).toThrow(
        'PINELABS_MERCHANT_ID, PINELABS_ACCESS_CODE, and PINELABS_SECRET_KEY must be set in environment variables'
      );
    });

    it('should initialize successfully with valid credentials', () => {
      expect(() => new PineLabsProvider()).not.toThrow();
    });

    it('should throw error if PINELABS_API_URL uses HTTP instead of HTTPS', () => {
      process.env.PINELABS_API_URL = 'http://api.pluralonline.com';
      expect(() => new PineLabsProvider()).toThrow(
        'PineLabs API URL must use HTTPS protocol for security'
      );
    });

    it('should accept HTTPS URL for PINELABS_API_URL', () => {
      process.env.PINELABS_API_URL = 'https://api.pluralonline.com';
      expect(() => new PineLabsProvider()).not.toThrow();
    });

    it('should use default HTTPS URL when PINELABS_API_URL is not set', () => {
      delete process.env.PINELABS_API_URL;
      const provider = new PineLabsProvider();
      expect(provider).toBeDefined();
    });
  });

  describe('getProviderKey', () => {
    it('should return the PineLabs merchant ID', () => {
      const provider = new PineLabsProvider();
      expect(provider.getProviderKey()).toBe('test_merchant_123');
    });
  });

  describe('createOrder', () => {
    it('should create an order with PineLabs API', async () => {
      const provider = new PineLabsProvider();
      const result = await provider.createOrder(50000, 'INR', { receipt: 'test_receipt' });

      expect(result).toBeDefined();
      expect(result.orderId).toBeDefined();
      expect(typeof result.orderId).toBe('string');
      expect(result.orderId.length).toBeGreaterThan(0);
      expect(result.amount).toBe(50000);
      expect(result.currency).toBe('INR');
    });

    it('should generate default receipt when not provided', async () => {
      const provider = new PineLabsProvider();
      const result = await provider.createOrder(50000, 'INR', {});

      expect(result).toBeDefined();
      expect(result.orderId).toBeDefined();
      expect(result.amount).toBe(50000);
      expect(result.currency).toBe('INR');
    });

    it('should handle various amounts correctly', async () => {
      const provider = new PineLabsProvider();
      
      const result1 = await provider.createOrder(1, 'INR', {});
      expect(result1.amount).toBe(1);

      const result2 = await provider.createOrder(999900, 'INR', {});
      expect(result2.amount).toBe(999900);

      const result3 = await provider.createOrder(10000000, 'INR', {});
      expect(result3.amount).toBe(10000000);
    });
  });

  describe('verifyPayment', () => {
    it('should verify valid payment signature', async () => {
      const provider = new PineLabsProvider();
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      const body = `${orderId}|${paymentId}|test_merchant_123`;
      
      // Generate valid signature
      const validSignature = crypto
        .createHmac('sha256', 'test_secret_key')
        .update(body)
        .digest('hex');

      const result = await provider.verifyPayment(orderId, paymentId, validSignature);
      expect(result).toBe(true);
    });

    it('should reject invalid payment signature', async () => {
      const provider = new PineLabsProvider();
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      const invalidSignature = 'invalid_signature_12345';

      const result = await provider.verifyPayment(orderId, paymentId, invalidSignature);
      expect(result).toBe(false);
    });

    it('should handle signature verification errors gracefully', async () => {
      const provider = new PineLabsProvider();
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      const malformedSignature = ''; // Empty signature

      const result = await provider.verifyPayment(orderId, paymentId, malformedSignature);
      expect(result).toBe(false);
    });

    it('should reject signature with wrong merchant ID', async () => {
      const provider = new PineLabsProvider();
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      
      // Generate signature with wrong merchant ID
      const body = `${orderId}|${paymentId}|wrong_merchant_id`;
      const wrongSignature = crypto
        .createHmac('sha256', 'test_secret_key')
        .update(body)
        .digest('hex');

      const result = await provider.verifyPayment(orderId, paymentId, wrongSignature);
      expect(result).toBe(false);
    });
  });
});
