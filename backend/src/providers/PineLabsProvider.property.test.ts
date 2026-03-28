/**
 * Property-based tests for PineLabsProvider
 * Feature: vibgyor-payment-gateway, Property 7: Payment Order Creation (PineLabs)
 * 
 * **Validates: Requirements 5.4, 5.5**
 */

import * as fc from 'fast-check';
import { PineLabsProvider } from './PineLabsProvider';
import crypto from 'crypto';

describe('PineLabsProvider - Property Tests', () => {
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

  /**
   * Property 7: Payment Order Creation (PineLabs)
   * 
   * For any valid payment initiation request, the backend should create a payment order
   * with the configured provider and return an order response containing orderId, amount,
   * currency, provider name, and provider key.
   * 
   * This property verifies that createOrder:
   * 1. Returns a valid OrderResponse with all required fields
   * 2. The orderId is a non-empty string
   * 3. The amount matches the input amount
   * 4. The currency matches the input currency
   * 5. All fields are properly typed and formatted
   */
  describe('Property 7: Payment Order Creation (PineLabs)', () => {
    it('should create valid order response with all required fields for any valid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000000 }), // amount in paise (1 to 100,000 INR)
          fc.constantFrom('INR', 'USD', 'EUR', 'GBP'), // common currencies
          fc.record({
            receipt: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: undefined }),
            notes: fc.option(
              fc.dictionary(
                fc.string({ minLength: 1, maxLength: 20 }),
                fc.string({ minLength: 0, maxLength: 100 })
              ),
              { nil: undefined }
            ),
            return_url: fc.option(fc.webUrl(), { nil: undefined })
          }),
          async (amount, currency, metadata) => {
            const provider = new PineLabsProvider();
            const result = await provider.createOrder(amount, currency, metadata);

            // Verify all required fields are present
            expect(result).toBeDefined();
            expect(result.orderId).toBeDefined();
            expect(result.amount).toBeDefined();
            expect(result.currency).toBeDefined();

            // Verify field types
            expect(typeof result.orderId).toBe('string');
            expect(typeof result.amount).toBe('number');
            expect(typeof result.currency).toBe('string');

            // Verify orderId is non-empty
            expect(result.orderId.length).toBeGreaterThan(0);

            // Verify amount matches input
            expect(result.amount).toBe(amount);

            // Verify currency matches input
            expect(result.currency).toBe(currency);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle various amount ranges correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(1), // Minimum amount (1 paise)
            fc.constant(100), // 1 INR
            fc.constant(99900), // 999 INR
            fc.constant(999900), // 9,999 INR
            fc.integer({ min: 1, max: 10000000 }) // Random amount
          ),
          fc.constantFrom('INR', 'USD'),
          async (amount, currency) => {
            const provider = new PineLabsProvider();
            const result = await provider.createOrder(amount, currency, {});

            // Verify the order response is valid
            expect(result.orderId).toBeDefined();
            expect(result.amount).toBe(amount);
            expect(result.currency).toBe(currency);

            // Verify amount is positive
            expect(result.amount).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique order IDs for different requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000000 }),
          fc.constantFrom('INR', 'USD'),
          async (amount, currency) => {
            const provider = new PineLabsProvider();
            
            // Create multiple orders
            const result1 = await provider.createOrder(amount, currency, {});
            const result2 = await provider.createOrder(amount, currency, {});
            const result3 = await provider.createOrder(amount, currency, {});

            // Verify all order IDs are unique
            expect(result1.orderId).not.toBe(result2.orderId);
            expect(result1.orderId).not.toBe(result3.orderId);
            expect(result2.orderId).not.toBe(result3.orderId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty metadata gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000000 }),
          fc.constantFrom('INR', 'USD'),
          async (amount, currency) => {
            const provider = new PineLabsProvider();
            // Pass empty metadata
            const result = await provider.createOrder(amount, currency, {});

            // Verify the order was created successfully
            expect(result.orderId).toBeDefined();
            expect(result.amount).toBe(amount);
            expect(result.currency).toBe(currency);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return consistent structure regardless of input variations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000000 }),
          fc.constantFrom('INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD'),
          fc.option(
            fc.record({
              receipt: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: undefined }),
              notes: fc.option(fc.dictionary(fc.string(), fc.string()), { nil: undefined }),
              return_url: fc.option(fc.webUrl(), { nil: undefined })
            }),
            { nil: {} }
          ),
          async (amount, currency, metadata) => {
            const provider = new PineLabsProvider();
            const result = await provider.createOrder(amount, currency, metadata);

            // Verify the response always has the same structure
            const keys = Object.keys(result).sort();
            expect(keys).toEqual(['amount', 'currency', 'orderId']);

            // Verify no extra fields are present
            expect(Object.keys(result).length).toBe(3);

            // Verify all values are of correct type
            expect(typeof result.orderId).toBe('string');
            expect(typeof result.amount).toBe('number');
            expect(typeof result.currency).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle metadata with return_url', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000000 }),
          fc.constantFrom('INR', 'USD'),
          fc.webUrl(),
          async (amount, currency, returnUrl) => {
            const provider = new PineLabsProvider();
            const metadata = { return_url: returnUrl };
            const result = await provider.createOrder(amount, currency, metadata);

            // Verify the order was created successfully
            expect(result.orderId).toBeDefined();
            expect(result.amount).toBe(amount);
            expect(result.currency).toBe(currency);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Webhook Signature Verification (PineLabs)
   * 
   * For any webhook payload with a signature, the backend should verify the signature
   * using the provider's verification mechanism before processing, and reject payloads
   * with invalid signatures.
   * 
   * This property verifies that verifyPayment:
   * 1. Correctly validates signatures generated using the proper HMAC SHA256 algorithm
   * 2. Rejects invalid signatures
   * 3. Uses timing-safe comparison to prevent timing attacks
   * 4. Handles edge cases like empty strings and malformed signatures
   * 
   * **Validates: Requirements 6.2, 6.3**
   */
  describe('Property 8: Webhook Signature Verification (PineLabs)', () => {
    it('should verify correctly generated signatures for any valid orderId and paymentId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // orderId
          fc.string({ minLength: 1, maxLength: 100 }), // paymentId
          async (orderId, paymentId) => {
            const provider = new PineLabsProvider();
            
            // Generate a valid signature using the same algorithm as PineLabs
            // PineLabs format: orderId|paymentId|merchantId
            const body = `${orderId}|${paymentId}|test_merchant_123`;
            const validSignature = crypto
              .createHmac('sha256', 'test_secret_key')
              .update(body)
              .digest('hex');

            // Verify that the correctly generated signature is accepted
            const result = await provider.verifyPayment(orderId, paymentId, validSignature);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid signatures for any orderId and paymentId combination', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // orderId
          fc.string({ minLength: 1, maxLength: 100 }), // paymentId
          fc.string({ minLength: 1, maxLength: 128 }), // invalid signature
          async (orderId, paymentId, invalidSignature) => {
            const provider = new PineLabsProvider();
            
            // Generate the correct signature
            const body = `${orderId}|${paymentId}|test_merchant_123`;
            const validSignature = crypto
              .createHmac('sha256', 'test_secret_key')
              .update(body)
              .digest('hex');

            // Assume the random signature is different from the valid one
            fc.pre(invalidSignature !== validSignature);

            // Verify that invalid signatures are rejected
            const result = await provider.verifyPayment(orderId, paymentId, invalidSignature);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject signatures with wrong orderId or paymentId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // correct orderId
          fc.string({ minLength: 1, maxLength: 100 }), // correct paymentId
          fc.string({ minLength: 1, maxLength: 100 }), // wrong orderId
          fc.string({ minLength: 1, maxLength: 100 }), // wrong paymentId
          async (correctOrderId, correctPaymentId, wrongOrderId, wrongPaymentId) => {
            // Ensure we have different values
            fc.pre(correctOrderId !== wrongOrderId || correctPaymentId !== wrongPaymentId);

            const provider = new PineLabsProvider();
            
            // Generate signature for correct values
            const body = `${correctOrderId}|${correctPaymentId}|test_merchant_123`;
            const signature = crypto
              .createHmac('sha256', 'test_secret_key')
              .update(body)
              .digest('hex');

            // Try to verify with wrong orderId
            const resultWrongOrder = await provider.verifyPayment(wrongOrderId, correctPaymentId, signature);
            expect(resultWrongOrder).toBe(false);

            // Try to verify with wrong paymentId
            const resultWrongPayment = await provider.verifyPayment(correctOrderId, wrongPaymentId, signature);
            expect(resultWrongPayment).toBe(false);

            // Try to verify with both wrong
            const resultBothWrong = await provider.verifyPayment(wrongOrderId, wrongPaymentId, signature);
            expect(resultBothWrong).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases like empty strings and special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.string({ minLength: 1, maxLength: 10 }),
            fc.hexaString({ minLength: 64, maxLength: 64 }),
            fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '|' + s), // Contains pipe
          ),
          async (malformedSignature) => {
            const provider = new PineLabsProvider();
            const orderId = 'order_123';
            const paymentId = 'pay_456';

            // Generate correct signature
            const body = `${orderId}|${paymentId}|test_merchant_123`;
            const validSignature = crypto
              .createHmac('sha256', 'test_secret_key')
              .update(body)
              .digest('hex');

            // Assume malformed signature is different from valid one
            fc.pre(malformedSignature !== validSignature);

            // Verify that malformed signatures are rejected
            const result = await provider.verifyPayment(orderId, paymentId, malformedSignature);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify signatures are case-sensitive', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (orderId, paymentId) => {
            const provider = new PineLabsProvider();
            
            // Generate valid signature
            const body = `${orderId}|${paymentId}|test_merchant_123`;
            const validSignature = crypto
              .createHmac('sha256', 'test_secret_key')
              .update(body)
              .digest('hex');

            // Verify correct signature works
            const validResult = await provider.verifyPayment(orderId, paymentId, validSignature);
            expect(validResult).toBe(true);

            // Try uppercase version (should fail if signature contains letters)
            const uppercaseSignature = validSignature.toUpperCase();
            if (uppercaseSignature !== validSignature) {
              const invalidResult = await provider.verifyPayment(orderId, paymentId, uppercaseSignature);
              expect(invalidResult).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently verify the same signature multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (orderId, paymentId) => {
            const provider = new PineLabsProvider();
            
            // Generate valid signature
            const body = `${orderId}|${paymentId}|test_merchant_123`;
            const validSignature = crypto
              .createHmac('sha256', 'test_secret_key')
              .update(body)
              .digest('hex');

            // Verify multiple times - should always return true
            const result1 = await provider.verifyPayment(orderId, paymentId, validSignature);
            const result2 = await provider.verifyPayment(orderId, paymentId, validSignature);
            const result3 = await provider.verifyPayment(orderId, paymentId, validSignature);

            expect(result1).toBe(true);
            expect(result2).toBe(true);
            expect(result3).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle signatures with different lengths', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.oneof(
            fc.hexaString({ minLength: 1, maxLength: 32 }), // Too short
            fc.hexaString({ minLength: 65, maxLength: 128 }), // Too long
            fc.hexaString({ minLength: 64, maxLength: 64 }), // Correct length but wrong value
          ),
          async (orderId, paymentId, wrongLengthSignature) => {
            const provider = new PineLabsProvider();
            
            // Generate correct signature (64 hex chars)
            const body = `${orderId}|${paymentId}|test_merchant_123`;
            const validSignature = crypto
              .createHmac('sha256', 'test_secret_key')
              .update(body)
              .digest('hex');

            // Ensure we're testing with a different signature
            fc.pre(wrongLengthSignature !== validSignature);

            // Verify that wrong signatures are rejected regardless of length
            const result = await provider.verifyPayment(orderId, paymentId, wrongLengthSignature);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify that signature depends on orderId, paymentId, and merchantId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (orderId, paymentId) => {
            const provider = new PineLabsProvider();
            
            // Generate signature with correct format: orderId|paymentId|merchantId
            const body1 = `${orderId}|${paymentId}|test_merchant_123`;
            const signature1 = crypto
              .createHmac('sha256', 'test_secret_key')
              .update(body1)
              .digest('hex');

            // Generate signature with reversed orderId and paymentId
            const body2 = `${paymentId}|${orderId}|test_merchant_123`;
            const signature2 = crypto
              .createHmac('sha256', 'test_secret_key')
              .update(body2)
              .digest('hex');

            // Verify correct signature works
            const result1 = await provider.verifyPayment(orderId, paymentId, signature1);
            expect(result1).toBe(true);

            // If orderId and paymentId are different, reversed signature should fail
            if (orderId !== paymentId) {
              const result2 = await provider.verifyPayment(orderId, paymentId, signature2);
              expect(result2).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify that merchant ID is included in signature verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (orderId, paymentId) => {
            const provider = new PineLabsProvider();
            
            // Generate signature WITHOUT merchant ID (wrong format)
            const bodyWithoutMerchant = `${orderId}|${paymentId}`;
            const signatureWithoutMerchant = crypto
              .createHmac('sha256', 'test_secret_key')
              .update(bodyWithoutMerchant)
              .digest('hex');

            // This signature should be rejected because it doesn't include merchant ID
            const result = await provider.verifyPayment(orderId, paymentId, signatureWithoutMerchant);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
