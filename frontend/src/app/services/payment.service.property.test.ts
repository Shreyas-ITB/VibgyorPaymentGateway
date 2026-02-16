import * as fc from 'fast-check';
import { PaymentService } from './payment.service';
import { SubscriptionData } from '../models/payment.models';

// Mock the API config module
jest.mock('../config/api.config', () => ({
  API_BASE_URL: 'http://localhost:3000'
}));

/**
 * Property-Based Tests for PaymentService
 * 
 * These tests verify universal properties that should hold true across all valid inputs
 * using randomized test data generation.
 */

describe('PaymentService - Property-Based Tests', () => {
  let service: PaymentService;
  let originalLocation: Location;

  beforeEach(() => {
    // Save original location
    originalLocation = window.location;
    
    // Mock window.location
    delete (window as any).location;
    (window as any).location = { href: '' };
    
    // Create service instance with mocked dependencies
    service = new PaymentService(null as any, null as any);
  });

  afterEach(() => {
    // Restore original location
    (window as any).location = originalLocation;
  });

  /**
   * Feature: vibgyor-payment-gateway, Property 11: Success Redirect URL Construction
   * 
   * For any successful payment with subscription_id, amount, and subscription_plan_id,
   * the redirect URL should be the original RedirectURL with these three values
   * correctly appended as query parameters.
   * 
   * This property verifies:
   * 1. The base redirect URL is preserved
   * 2. subscription_id is added as a query parameter
   * 3. amount is added as a query parameter
   * 4. subscription_plan_id is added as a query parameter
   * 5. Existing query parameters in the redirect URL are preserved
   * 6. The constructed URL is valid and can be parsed
   * 
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  describe('Property 11: Success Redirect URL Construction', () => {
    it('should construct redirect URL with all subscription parameters', () => {
      fc.assert(
        fc.property(
          // Generate valid subscription data
          fc.record({
            subscription_id: fc.uuid(),
            amount: fc.integer({ min: 1, max: 1000000 }),
            subscription_plan_id: fc.stringOf(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')),
              { minLength: 1, maxLength: 50 }
            )
          }),
          // Generate valid redirect URLs (with and without existing query params)
          fc.oneof(
            fc.webUrl(),
            fc.webUrl().chain(url => 
              fc.record({
                param1: fc.string({ minLength: 1, maxLength: 20 }),
                param2: fc.string({ minLength: 1, maxLength: 20 })
              }).map(params => `${url}?param1=${params.param1}&param2=${params.param2}`)
            )
          ),
          (subscriptionData: SubscriptionData, redirectUrl: string) => {
            // Call the method under test
            service.handlePaymentSuccess(subscriptionData, redirectUrl);

            // Parse the resulting URL
            const resultUrl = new URL(window.location.href);
            const originalUrl = new URL(redirectUrl);

            // Verify base URL is preserved (protocol, host, pathname)
            expect(resultUrl.protocol).toBe(originalUrl.protocol);
            expect(resultUrl.host).toBe(originalUrl.host);
            expect(resultUrl.pathname).toBe(originalUrl.pathname);

            // Verify subscription parameters are added
            expect(resultUrl.searchParams.get('subscription_id')).toBe(subscriptionData.subscription_id);
            expect(resultUrl.searchParams.get('amount')).toBe(subscriptionData.amount.toString());
            expect(resultUrl.searchParams.get('subscription_plan_id')).toBe(subscriptionData.subscription_plan_id);

            // Verify existing query parameters are preserved
            originalUrl.searchParams.forEach((value, key) => {
              expect(resultUrl.searchParams.get(key)).toBe(value);
            });

            // Verify the URL is valid
            expect(() => new URL(window.location.href)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in subscription data', () => {
      fc.assert(
        fc.property(
          fc.record({
            subscription_id: fc.uuid(),
            amount: fc.integer({ min: 1, max: 1000000 }),
            // Include special characters that need URL encoding
            subscription_plan_id: fc.stringOf(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_&=+#'.split('')),
              { minLength: 1, maxLength: 50 }
            )
          }),
          fc.webUrl(),
          (subscriptionData: SubscriptionData, redirectUrl: string) => {
            service.handlePaymentSuccess(subscriptionData, redirectUrl);

            const resultUrl = new URL(window.location.href);

            // Verify parameters are properly URL encoded and decoded
            expect(resultUrl.searchParams.get('subscription_id')).toBe(subscriptionData.subscription_id);
            expect(resultUrl.searchParams.get('amount')).toBe(subscriptionData.amount.toString());
            expect(resultUrl.searchParams.get('subscription_plan_id')).toBe(subscriptionData.subscription_plan_id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should construct valid URLs for any valid subscription data and redirect URL', () => {
      fc.assert(
        fc.property(
          fc.record({
            subscription_id: fc.uuid(),
            amount: fc.integer({ min: 1, max: 1000000 }),
            subscription_plan_id: fc.stringOf(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')),
              { minLength: 1, maxLength: 50 }
            )
          }),
          fc.webUrl(),
          (subscriptionData: SubscriptionData, redirectUrl: string) => {
            service.handlePaymentSuccess(subscriptionData, redirectUrl);

            // The constructed URL should be valid and parseable
            expect(() => new URL(window.location.href)).not.toThrow();
            
            // The URL should start with the redirect URL base
            expect(window.location.href).toContain(new URL(redirectUrl).origin);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all three required parameters in any order', () => {
      fc.assert(
        fc.property(
          fc.record({
            subscription_id: fc.uuid(),
            amount: fc.integer({ min: 1, max: 1000000 }),
            subscription_plan_id: fc.stringOf(
              fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')),
              { minLength: 1, maxLength: 50 }
            )
          }),
          fc.webUrl(),
          (subscriptionData: SubscriptionData, redirectUrl: string) => {
            service.handlePaymentSuccess(subscriptionData, redirectUrl);

            const resultUrl = new URL(window.location.href);

            // All three parameters must be present
            expect(resultUrl.searchParams.has('subscription_id')).toBe(true);
            expect(resultUrl.searchParams.has('amount')).toBe(true);
            expect(resultUrl.searchParams.has('subscription_plan_id')).toBe(true);

            // And they must have the correct values
            expect(resultUrl.searchParams.get('subscription_id')).toBe(subscriptionData.subscription_id);
            expect(resultUrl.searchParams.get('amount')).toBe(subscriptionData.amount.toString());
            expect(resultUrl.searchParams.get('subscription_plan_id')).toBe(subscriptionData.subscription_plan_id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: vibgyor-payment-gateway, Property 12: Payment Failure Handling
   * 
   * For any payment failure with an error reason, the system should display an error
   * message to the user and redirect to the RedirectURL with an error parameter
   * containing the failure reason.
   * 
   * This property verifies:
   * 1. The base redirect URL is preserved
   * 2. error parameter is added with the failure reason
   * 3. payment_status parameter is added with value 'failed'
   * 4. Existing query parameters in the redirect URL are preserved
   * 5. The constructed URL is valid and can be parsed
   * 6. Special characters in error messages are properly URL encoded
   * 
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
   */
  describe('Property 12: Payment Failure Handling', () => {
    it('should construct redirect URL with error parameter for any failure', () => {
      fc.assert(
        fc.property(
          // Generate various error messages
          fc.oneof(
            fc.constant('Payment declined by bank'),
            fc.constant('Insufficient funds'),
            fc.constant('Card expired'),
            fc.constant('Invalid CVV'),
            fc.constant('Network timeout'),
            fc.constant('Payment cancelled by user'),
            fc.string({ minLength: 1, maxLength: 200 })
          ),
          // Generate valid redirect URLs (with and without existing query params)
          fc.oneof(
            fc.webUrl(),
            fc.webUrl().chain(url => 
              fc.record({
                param1: fc.string({ minLength: 1, maxLength: 20 }),
                param2: fc.string({ minLength: 1, maxLength: 20 })
              }).map(params => `${url}?param1=${params.param1}&param2=${params.param2}`)
            )
          ),
          (errorMessage: string, redirectUrl: string) => {
            // Call the method under test
            service.handlePaymentFailure(errorMessage, redirectUrl);

            // Parse the resulting URL
            const resultUrl = new URL(window.location.href);
            const originalUrl = new URL(redirectUrl);

            // Verify base URL is preserved (protocol, host, pathname)
            expect(resultUrl.protocol).toBe(originalUrl.protocol);
            expect(resultUrl.host).toBe(originalUrl.host);
            expect(resultUrl.pathname).toBe(originalUrl.pathname);

            // Verify error parameter is added
            expect(resultUrl.searchParams.get('error')).toBe(errorMessage);
            
            // Verify payment_status parameter is added
            expect(resultUrl.searchParams.get('payment_status')).toBe('failed');

            // Verify existing query parameters are preserved
            originalUrl.searchParams.forEach((value, key) => {
              expect(resultUrl.searchParams.get(key)).toBe(value);
            });

            // Verify the URL is valid
            expect(() => new URL(window.location.href)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in error messages', () => {
      fc.assert(
        fc.property(
          // Generate error messages with special characters that need URL encoding
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.webUrl(),
          (errorMessage: string, redirectUrl: string) => {
            service.handlePaymentFailure(errorMessage, redirectUrl);

            const resultUrl = new URL(window.location.href);

            // Verify error message is properly URL encoded and decoded
            expect(resultUrl.searchParams.get('error')).toBe(errorMessage);
            expect(resultUrl.searchParams.get('payment_status')).toBe('failed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should construct valid URLs for any error message and redirect URL', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.webUrl(),
          (errorMessage: string, redirectUrl: string) => {
            service.handlePaymentFailure(errorMessage, redirectUrl);

            // The constructed URL should be valid and parseable
            expect(() => new URL(window.location.href)).not.toThrow();
            
            // The URL should start with the redirect URL base
            expect(window.location.href).toContain(new URL(redirectUrl).origin);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always include both error and payment_status parameters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.webUrl(),
          (errorMessage: string, redirectUrl: string) => {
            service.handlePaymentFailure(errorMessage, redirectUrl);

            const resultUrl = new URL(window.location.href);

            // Both parameters must be present
            expect(resultUrl.searchParams.has('error')).toBe(true);
            expect(resultUrl.searchParams.has('payment_status')).toBe(true);

            // And they must have the correct values
            expect(resultUrl.searchParams.get('error')).toBe(errorMessage);
            expect(resultUrl.searchParams.get('payment_status')).toBe('failed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve existing query parameters when adding error', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.webUrl(),
          fc.record({
            existingParam1: fc.string({ minLength: 1, maxLength: 50 }),
            existingParam2: fc.string({ minLength: 1, maxLength: 50 })
          }),
          (errorMessage: string, baseUrl: string, existingParams: any) => {
            // Construct redirect URL with existing parameters
            const redirectUrl = `${baseUrl}?existingParam1=${encodeURIComponent(existingParams.existingParam1)}&existingParam2=${encodeURIComponent(existingParams.existingParam2)}`;
            
            service.handlePaymentFailure(errorMessage, redirectUrl);

            const resultUrl = new URL(window.location.href);

            // Verify existing parameters are preserved
            expect(resultUrl.searchParams.get('existingParam1')).toBe(existingParams.existingParam1);
            expect(resultUrl.searchParams.get('existingParam2')).toBe(existingParams.existingParam2);

            // Verify error parameters are added
            expect(resultUrl.searchParams.get('error')).toBe(errorMessage);
            expect(resultUrl.searchParams.get('payment_status')).toBe('failed');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
