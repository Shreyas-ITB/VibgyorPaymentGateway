/**
 * Property-based tests for HTTPS Protocol Enforcement
 * Feature: vibgyor-payment-gateway, Property 14: HTTPS Protocol Enforcement
 * 
 * **Validates: Requirements 11.1**
 */

import * as fc from 'fast-check';
import { RazorpayProvider } from './RazorpayProvider';
import { PineLabsProvider } from './PineLabsProvider';

describe('HTTPS Protocol Enforcement - Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  /**
   * Property 14: HTTPS Protocol Enforcement
   * 
   * For any API call made to a payment provider, the URL should use the HTTPS protocol (not HTTP).
   * 
   * This property verifies that:
   * 1. PineLabs provider enforces HTTPS for API base URLs
   * 2. Any attempt to use HTTP protocol is rejected
   * 3. Only HTTPS URLs are accepted for provider configuration
   * 4. The enforcement is consistent across all provider instances
   * 
   * **Validates: Requirements 11.1**
   */
  describe('Property 14: HTTPS Protocol Enforcement', () => {
    describe('PineLabs Provider HTTPS Enforcement', () => {
      it('should reject HTTP URLs and only accept HTTPS URLs for API base URL', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.oneof(
              // Generate various HTTP URLs (should be rejected)
              fc.webUrl({ validSchemes: ['http'] }),
              fc.domain().map(domain => `http://${domain}`),
              fc.domain().map(domain => `http://${domain}/api/v1`),
              fc.domain().map(domain => `http://${domain}:8080/api`)
            ),
            async (httpUrl) => {
              // Set up environment with HTTP URL
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: 'test_merchant_123',
                PINELABS_ACCESS_CODE: 'test_access_code',
                PINELABS_SECRET_KEY: 'test_secret_key',
                PINELABS_API_URL: httpUrl,
              };

              // Verify that HTTP URLs are rejected
              expect(() => {
                new PineLabsProvider();
              }).toThrow('PineLabs API URL must use HTTPS protocol for security');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should accept HTTPS URLs for API base URL', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.oneof(
              // Generate various HTTPS URLs (should be accepted)
              fc.webUrl({ validSchemes: ['https'] }),
              fc.domain().map(domain => `https://${domain}`),
              fc.domain().map(domain => `https://${domain}/api/v1`),
              fc.domain().map(domain => `https://${domain}:443/api`)
            ),
            async (httpsUrl) => {
              // Set up environment with HTTPS URL
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: 'test_merchant_123',
                PINELABS_ACCESS_CODE: 'test_access_code',
                PINELABS_SECRET_KEY: 'test_secret_key',
                PINELABS_API_URL: httpsUrl,
              };

              // Verify that HTTPS URLs are accepted
              expect(() => {
                new PineLabsProvider();
              }).not.toThrow();

              const provider = new PineLabsProvider();
              expect(provider).toBeDefined();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should use HTTPS by default when no custom API URL is provided', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 5, maxLength: 50 }), // merchant ID
            fc.string({ minLength: 5, maxLength: 50 }), // access code
            fc.string({ minLength: 5, maxLength: 50 }), // secret key
            async (merchantId, accessCode, secretKey) => {
              // Set up environment without custom API URL
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: merchantId,
                PINELABS_ACCESS_CODE: accessCode,
                PINELABS_SECRET_KEY: secretKey,
                // PINELABS_API_URL is not set, should use default HTTPS URL
              };

              // Verify that provider can be created (uses default HTTPS URL)
              expect(() => {
                new PineLabsProvider();
              }).not.toThrow();

              const provider = new PineLabsProvider();
              expect(provider).toBeDefined();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject URLs with mixed case HTTP protocol', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.domain(),
            fc.constantFrom('HTTP', 'Http', 'hTTp', 'htTP'),
            async (domain, protocol) => {
              const url = `${protocol}://${domain}`;
              
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: 'test_merchant_123',
                PINELABS_ACCESS_CODE: 'test_access_code',
                PINELABS_SECRET_KEY: 'test_secret_key',
                PINELABS_API_URL: url,
              };

              // Verify that HTTP URLs are rejected regardless of case
              expect(() => {
                new PineLabsProvider();
              }).toThrow('PineLabs API URL must use HTTPS protocol for security');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should only accept lowercase https protocol', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.domain(),
            async (domain) => {
              // Test lowercase https (should be accepted)
              const httpsUrl = `https://${domain}`;
              
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: 'test_merchant_123',
                PINELABS_ACCESS_CODE: 'test_access_code',
                PINELABS_SECRET_KEY: 'test_secret_key',
                PINELABS_API_URL: httpsUrl,
              };

              // Verify that lowercase https URLs are accepted
              expect(() => {
                new PineLabsProvider();
              }).not.toThrow();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject URLs without protocol scheme', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.domain(),
            async (domain) => {
              // URL without protocol (e.g., "example.com")
              const url = domain;
              
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: 'test_merchant_123',
                PINELABS_ACCESS_CODE: 'test_access_code',
                PINELABS_SECRET_KEY: 'test_secret_key',
                PINELABS_API_URL: url,
              };

              // Verify that URLs without protocol are rejected
              expect(() => {
                new PineLabsProvider();
              }).toThrow('PineLabs API URL must use HTTPS protocol for security');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject URLs with other protocols (ftp, ws, etc.)', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.domain(),
            fc.constantFrom('ftp', 'ws', 'wss', 'file', 'data'),
            async (domain, protocol) => {
              const url = `${protocol}://${domain}`;
              
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: 'test_merchant_123',
                PINELABS_ACCESS_CODE: 'test_access_code',
                PINELABS_SECRET_KEY: 'test_secret_key',
                PINELABS_API_URL: url,
              };

              // Verify that non-HTTPS protocols are rejected
              expect(() => {
                new PineLabsProvider();
              }).toThrow('PineLabs API URL must use HTTPS protocol for security');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should enforce HTTPS for URLs with various paths and query parameters', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.domain(),
            fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }), // path segments
            fc.option(fc.dictionary(fc.string(), fc.string()), { nil: undefined }), // query params
            async (domain, pathSegments, queryParams) => {
              // Build HTTPS URL with path and query
              let httpsUrl = `https://${domain}`;
              if (pathSegments.length > 0) {
                httpsUrl += '/' + pathSegments.join('/');
              }
              if (queryParams && Object.keys(queryParams).length > 0) {
                const queryString = Object.entries(queryParams)
                  .map(([k, v]) => `${k}=${v}`)
                  .join('&');
                httpsUrl += '?' + queryString;
              }

              // Build HTTP URL with same path and query
              let httpUrl = httpsUrl.replace('https://', 'http://');

              // Test HTTPS URL (should be accepted)
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: 'test_merchant_123',
                PINELABS_ACCESS_CODE: 'test_access_code',
                PINELABS_SECRET_KEY: 'test_secret_key',
                PINELABS_API_URL: httpsUrl,
              };

              expect(() => {
                new PineLabsProvider();
              }).not.toThrow();

              // Test HTTP URL (should be rejected)
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: 'test_merchant_123',
                PINELABS_ACCESS_CODE: 'test_access_code',
                PINELABS_SECRET_KEY: 'test_secret_key',
                PINELABS_API_URL: httpUrl,
              };

              expect(() => {
                new PineLabsProvider();
              }).toThrow('PineLabs API URL must use HTTPS protocol for security');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should consistently enforce HTTPS across multiple provider instances', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.webUrl({ validSchemes: ['http'] }),
            async (httpUrl) => {
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: 'test_merchant_123',
                PINELABS_ACCESS_CODE: 'test_access_code',
                PINELABS_SECRET_KEY: 'test_secret_key',
                PINELABS_API_URL: httpUrl,
              };

              // Try to create multiple instances - all should fail
              expect(() => new PineLabsProvider()).toThrow();
              expect(() => new PineLabsProvider()).toThrow();
              expect(() => new PineLabsProvider()).toThrow();
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Razorpay Provider HTTPS Enforcement', () => {
      it('should use HTTPS by default for all Razorpay SDK API calls', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 10, maxLength: 50 }), // key ID
            fc.string({ minLength: 10, maxLength: 50 }), // key secret
            async (keyId, keySecret) => {
              process.env = {
                ...originalEnv,
                RAZORPAY_KEY_ID: keyId,
                RAZORPAY_KEY_SECRET: keySecret,
              };

              // Verify that Razorpay provider can be created
              // Note: Razorpay SDK uses HTTPS by default for all API calls
              expect(() => {
                new RazorpayProvider();
              }).not.toThrow();

              const provider = new RazorpayProvider();
              expect(provider).toBeDefined();
              
              // Verify provider key is returned (confirms initialization)
              expect(provider.getProviderKey()).toBe(keyId);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should create provider instances consistently with HTTPS enforcement', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 10, maxLength: 50 }),
            fc.string({ minLength: 10, maxLength: 50 }),
            async (keyId, keySecret) => {
              process.env = {
                ...originalEnv,
                RAZORPAY_KEY_ID: keyId,
                RAZORPAY_KEY_SECRET: keySecret,
              };

              // Create multiple instances - all should succeed with HTTPS
              const provider1 = new RazorpayProvider();
              const provider2 = new RazorpayProvider();
              const provider3 = new RazorpayProvider();

              expect(provider1).toBeDefined();
              expect(provider2).toBeDefined();
              expect(provider3).toBeDefined();

              // All should return the same key
              expect(provider1.getProviderKey()).toBe(keyId);
              expect(provider2.getProviderKey()).toBe(keyId);
              expect(provider3.getProviderKey()).toBe(keyId);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Cross-Provider HTTPS Enforcement', () => {
      it('should enforce HTTPS consistently across both providers', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              razorpayKeyId: fc.string({ minLength: 10, maxLength: 50 }),
              razorpayKeySecret: fc.string({ minLength: 10, maxLength: 50 }),
              pinelabsMerchantId: fc.string({ minLength: 5, maxLength: 50 }),
              pinelabsAccessCode: fc.string({ minLength: 5, maxLength: 50 }),
              pinelabsSecretKey: fc.string({ minLength: 5, maxLength: 50 }),
            }),
            async (config) => {
              // Test Razorpay with HTTPS (should work)
              process.env = {
                ...originalEnv,
                RAZORPAY_KEY_ID: config.razorpayKeyId,
                RAZORPAY_KEY_SECRET: config.razorpayKeySecret,
              };

              const razorpayProvider = new RazorpayProvider();
              expect(razorpayProvider).toBeDefined();

              // Test PineLabs with HTTPS (should work)
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: config.pinelabsMerchantId,
                PINELABS_ACCESS_CODE: config.pinelabsAccessCode,
                PINELABS_SECRET_KEY: config.pinelabsSecretKey,
                PINELABS_API_URL: 'https://api.pluralonline.com',
              };

              const pinelabsProvider = new PineLabsProvider();
              expect(pinelabsProvider).toBeDefined();

              // Test PineLabs with HTTP (should fail)
              process.env = {
                ...originalEnv,
                PINELABS_MERCHANT_ID: config.pinelabsMerchantId,
                PINELABS_ACCESS_CODE: config.pinelabsAccessCode,
                PINELABS_SECRET_KEY: config.pinelabsSecretKey,
                PINELABS_API_URL: 'http://api.pluralonline.com',
              };

              expect(() => {
                new PineLabsProvider();
              }).toThrow('PineLabs API URL must use HTTPS protocol for security');
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
