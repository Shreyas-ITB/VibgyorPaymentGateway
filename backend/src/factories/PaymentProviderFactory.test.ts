/**
 * Unit tests for PaymentProviderFactory
 */

import { PaymentProviderFactory } from './PaymentProviderFactory';
import { RazorpayProvider } from '../providers/RazorpayProvider';
import { PineLabsProvider } from '../providers/PineLabsProvider';

// Mock the providers to avoid needing real credentials
jest.mock('../providers/RazorpayProvider');
jest.mock('../providers/PineLabsProvider');

describe('PaymentProviderFactory', () => {
  const originalEnv = process.env.PAYMENT_PROVIDER;

  beforeEach(() => {
    // Set up mock environment variables for Razorpay
    process.env.RAZORPAY_KEY_ID = 'test_key_id';
    process.env.RAZORPAY_KEY_SECRET = 'test_key_secret';
    
    // Set up mock environment variables for PineLabs
    process.env.PINELABS_MERCHANT_ID = 'test_merchant_id';
    process.env.PINELABS_ACCESS_CODE = 'test_access_code';
    process.env.PINELABS_SECRET_KEY = 'test_secret_key';
  });

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv) {
      process.env.PAYMENT_PROVIDER = originalEnv;
    } else {
      delete process.env.PAYMENT_PROVIDER;
    }
    jest.clearAllMocks();
  });

  describe('createProvider', () => {
    it('should throw error when PAYMENT_PROVIDER is not set', () => {
      delete process.env.PAYMENT_PROVIDER;
      
      expect(() => PaymentProviderFactory.createProvider()).toThrow(
        'PAYMENT_PROVIDER environment variable is not set'
      );
    });

    it('should throw error for invalid provider', () => {
      process.env.PAYMENT_PROVIDER = 'invalid_provider';
      
      expect(() => PaymentProviderFactory.createProvider()).toThrow(
        "Invalid payment provider: invalid_provider. Must be 'razorpay' or 'pinelabs'"
      );
    });

    it('should create RazorpayProvider when PAYMENT_PROVIDER is razorpay', () => {
      process.env.PAYMENT_PROVIDER = 'razorpay';
      
      const provider = PaymentProviderFactory.createProvider();
      expect(provider).toBeInstanceOf(RazorpayProvider);
    });

    it('should create PineLabsProvider when PAYMENT_PROVIDER is pinelabs', () => {
      process.env.PAYMENT_PROVIDER = 'pinelabs';
      
      const provider = PaymentProviderFactory.createProvider();
      expect(provider).toBeInstanceOf(PineLabsProvider);
    });

    it('should handle case-insensitive provider names', () => {
      process.env.PAYMENT_PROVIDER = 'RAZORPAY';
      
      const provider = PaymentProviderFactory.createProvider();
      expect(provider).toBeInstanceOf(RazorpayProvider);
    });

    it('should handle case-insensitive provider names for pinelabs', () => {
      process.env.PAYMENT_PROVIDER = 'PINELABS';
      
      const provider = PaymentProviderFactory.createProvider();
      expect(provider).toBeInstanceOf(PineLabsProvider);
    });
  });
});
