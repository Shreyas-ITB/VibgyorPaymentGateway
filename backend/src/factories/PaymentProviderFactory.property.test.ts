/**
 * Property-based tests for PaymentProviderFactory
 * Feature: vibgyor-payment-gateway, Property: Provider factory configuration
 * 
 * **Validates: Requirements 10.2, 10.3**
 */

import * as fc from 'fast-check';
import { PaymentProviderFactory } from './PaymentProviderFactory';
import { RazorpayProvider } from '../providers/RazorpayProvider';
import { PineLabsProvider } from '../providers/PineLabsProvider';

// Mock the providers to avoid needing real credentials
jest.mock('../providers/RazorpayProvider');
jest.mock('../providers/PineLabsProvider');

describe('PaymentProviderFactory - Property Tests', () => {
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

  /**
   * Property: Provider factory configuration
   * 
   * For any valid provider name ('razorpay' or 'pinelabs'), setting PAYMENT_PROVIDER
   * to that value should result in the factory creating that specific provider.
   * 
   * For Razorpay (implemented in task 3.1), we verify that:
   * 1. The factory recognizes the valid provider name
   * 2. The factory creates a RazorpayProvider instance
   * 
   * For PineLabs (implemented in task 4.1), we verify that:
   * 1. The factory recognizes the valid provider name
   * 2. The factory creates a PineLabsProvider instance
   * 
   * Invalid provider names are rejected with appropriate error messages
   */
  describe('Property: Provider factory configuration', () => {
    it('should recognize valid provider names (razorpay, pinelabs) regardless of case', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('razorpay', 'pinelabs'),
          fc.constantFrom('lower', 'upper', 'mixed'),
          (provider, caseType) => {
            // Transform provider name based on case type
            let providerName: string;
            switch (caseType) {
              case 'upper':
                providerName = provider.toUpperCase();
                break;
              case 'mixed':
                providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
                break;
              default:
                providerName = provider.toLowerCase();
            }

            process.env.PAYMENT_PROVIDER = providerName;

            const expectedProvider = provider.toLowerCase();
            
            if (expectedProvider === 'razorpay') {
              // Razorpay is implemented - should create instance successfully
              const providerInstance = PaymentProviderFactory.createProvider();
              expect(providerInstance).toBeDefined();
              expect(providerInstance).toBeInstanceOf(RazorpayProvider);
              expect(providerInstance.getProviderKey).toBeDefined();
              expect(providerInstance.createOrder).toBeDefined();
              expect(providerInstance.verifyPayment).toBeDefined();
            } else if (expectedProvider === 'pinelabs') {
              // PineLabs is now implemented - should create instance successfully
              const providerInstance = PaymentProviderFactory.createProvider();
              expect(providerInstance).toBeDefined();
              expect(providerInstance).toBeInstanceOf(PineLabsProvider);
              expect(providerInstance.getProviderKey).toBeDefined();
              expect(providerInstance.createOrder).toBeDefined();
              expect(providerInstance.verifyPayment).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid provider names with appropriate error', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(
            s => !['razorpay', 'pinelabs', 'RAZORPAY', 'PINELABS', 'Razorpay', 'Pinelabs'].includes(s)
          ),
          (invalidProvider) => {
            process.env.PAYMENT_PROVIDER = invalidProvider;

            expect(() => PaymentProviderFactory.createProvider()).toThrow(
              `Invalid payment provider: ${invalidProvider}. Must be 'razorpay' or 'pinelabs'`
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error when PAYMENT_PROVIDER is not set', () => {
      fc.assert(
        fc.property(
          fc.constant(undefined),
          () => {
            delete process.env.PAYMENT_PROVIDER;

            expect(() => PaymentProviderFactory.createProvider()).toThrow(
              'PAYMENT_PROVIDER environment variable is not set'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty string as not set (JavaScript falsy behavior)', () => {
      fc.assert(
        fc.property(
          fc.constant(''),
          (emptyString) => {
            process.env.PAYMENT_PROVIDER = emptyString;

            // Empty string is falsy in JavaScript, so it's treated as "not set"
            expect(() => PaymentProviderFactory.createProvider()).toThrow(
              'PAYMENT_PROVIDER environment variable is not set'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle whitespace-only strings as invalid provider', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 }),
          (whitespaceString) => {
            process.env.PAYMENT_PROVIDER = whitespaceString;

            // The factory converts to lowercase, so whitespace will remain whitespace
            // We just verify it throws an error containing the expected message parts
            expect(() => PaymentProviderFactory.createProvider()).toThrow(
              /Invalid payment provider:/
            );
            
            try {
              PaymentProviderFactory.createProvider();
            } catch (error) {
              const errorMessage = (error as Error).message;
              expect(errorMessage).toContain("Must be 'razorpay' or 'pinelabs'");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
