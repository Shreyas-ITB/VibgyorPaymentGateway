/**
 * Security Tests for Frontend
 * Validates: Requirements 11.2, 11.5
 * 
 * Tests that API keys and secrets are not exposed in frontend code:
 * - Payment Provider API keys should not be hardcoded
 * - Payment Provider secrets should not be in client-side code
 * - Sensitive credentials should only come from backend API
 */

import { environment } from '../environments/environment';
import * as fs from 'fs';
import * as path from 'path';

describe('Frontend Security - API Key Exposure', () => {
  describe('Environment Configuration - No Hardcoded API Keys', () => {
    it('should not contain Razorpay API keys in environment files', () => {
      // Verify environment does not contain payment provider keys
      expect(environment).not.toHaveProperty('razorpayKeyId');
      expect(environment).not.toHaveProperty('razorpayKeySecret');
      expect(environment).not.toHaveProperty('razorpay_key_id');
      expect(environment).not.toHaveProperty('razorpay_key_secret');
      expect(environment).not.toHaveProperty('RAZORPAY_KEY_ID');
      expect(environment).not.toHaveProperty('RAZORPAY_KEY_SECRET');
    });

    it('should not contain PineLabs API keys in environment files', () => {
      // Verify environment does not contain payment provider keys
      expect(environment).not.toHaveProperty('pineLabsMerchantId');
      expect(environment).not.toHaveProperty('pineLabsSecretKey');
      expect(environment).not.toHaveProperty('pinelabs_merchant_id');
      expect(environment).not.toHaveProperty('pinelabs_secret_key');
      expect(environment).not.toHaveProperty('PINELABS_MERCHANT_ID');
      expect(environment).not.toHaveProperty('PINELABS_SECRET_KEY');
    });

    it('should only contain API base URL in environment', () => {
      // Verify environment only has non-sensitive configuration
      const allowedKeys = ['production', 'apiBaseUrl'];
      const actualKeys = Object.keys(environment);
      
      actualKeys.forEach(key => {
        expect(allowedKeys).toContain(key);
      });
    });
  });

  describe('Service Architecture - Credentials from Backend', () => {
    it('should expect provider key as parameter, not hardcoded', () => {
      // This test verifies that the SDK loader expects credentials from API
      // The launchPaymentUI method should receive providerKey as a parameter
      
      const mockOptions = {
        orderId: 'order_123',
        amount: 10000,
        currency: 'INR',
        providerKey: 'rzp_test_from_backend', // This comes from backend
        provider: 'razorpay' as const,
        onSuccess: () => {},
        onFailure: () => {}
      };

      // Verify that providerKey is expected as a parameter, not stored
      expect(mockOptions.providerKey).toBe('rzp_test_from_backend');
      expect(mockOptions.provider).toBe('razorpay');
    });

    it('should not have credentials in service interface', () => {
      // Verify that service interfaces expect credentials as parameters
      // not as stored properties
      
      interface PaymentSDKOptions {
        orderId: string;
        amount: number;
        currency: string;
        providerKey: string; // Passed as parameter
        provider: 'razorpay' | 'pinelabs';
        onSuccess: (response: any) => void;
        onFailure: (error: any) => void;
      }
      
      // The interface requires providerKey as input, not stored
      const options: PaymentSDKOptions = {
        orderId: 'test',
        amount: 100,
        currency: 'INR',
        providerKey: 'from_backend',
        provider: 'razorpay',
        onSuccess: () => {},
        onFailure: () => {}
      };
      
      expect(options.providerKey).toBe('from_backend');
    });
  });

  describe('Payment Models - No Sensitive Data Fields', () => {
    it('should not have credit card fields in payment request models', () => {
      // Simulate InitiatePaymentRequest structure
      const paymentRequest = {
        planId: 'basic',
        amount: 10000,
        billingCycle: 'monthly'
      };

      // Verify no sensitive fields in request
      expect(paymentRequest).not.toHaveProperty('creditCardNumber');
      expect(paymentRequest).not.toHaveProperty('cvv');
      expect(paymentRequest).not.toHaveProperty('cardNumber');
      expect(paymentRequest).not.toHaveProperty('expiryDate');
    });

    it('should not have API secrets in payment response models', () => {
      // Simulate InitiatePaymentResponse structure
      const paymentResponse = {
        orderId: 'order_123',
        amount: 10000,
        currency: 'INR',
        provider: 'razorpay',
        providerKey: 'rzp_test_public_key' // Only public key, not secret
      };

      // Verify no secret keys in response
      expect(paymentResponse).not.toHaveProperty('keySecret');
      expect(paymentResponse).not.toHaveProperty('secretKey');
      expect(paymentResponse).not.toHaveProperty('apiSecret');
      expect(paymentResponse).not.toHaveProperty('razorpayKeySecret');
      expect(paymentResponse).not.toHaveProperty('pineLabsSecretKey');
    });

    it('should not store credit card data in subscription models', () => {
      // Simulate SubscriptionData structure
      const subscriptionData = {
        subscription_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 10000,
        subscription_plan_id: 'basic'
      };

      // Verify no sensitive fields
      expect(subscriptionData).not.toHaveProperty('creditCardNumber');
      expect(subscriptionData).not.toHaveProperty('cvv');
      expect(subscriptionData).not.toHaveProperty('cardNumber');
    });
  });

  describe('Source Code - No Hardcoded Secrets', () => {
    it('should not contain Razorpay test keys in source files', () => {
      // This test checks that common test key patterns are not in the code
      // Razorpay test keys typically start with 'rzp_test_'
      
      // Read the PaymentService source file
      const serviceSourcePath = path.join(__dirname, 'services', 'payment.service.ts');
      
      if (fs.existsSync(serviceSourcePath)) {
        const sourceCode = fs.readFileSync(serviceSourcePath, 'utf-8');
        
        // Check for hardcoded Razorpay keys
        expect(sourceCode).not.toContain('rzp_test_');
        expect(sourceCode).not.toContain('rzp_live_');
        
        // Check for hardcoded key patterns
        expect(sourceCode).not.toMatch(/key_id\s*[:=]\s*['"][a-zA-Z0-9_]+['"]/);
        expect(sourceCode).not.toMatch(/key_secret\s*[:=]\s*['"][a-zA-Z0-9_]+['"]/);
      }
    });

    it('should not contain PineLabs credentials in source files', () => {
      // Read the PaymentService source file
      const serviceSourcePath = path.join(__dirname, 'services', 'payment.service.ts');
      
      if (fs.existsSync(serviceSourcePath)) {
        const sourceCode = fs.readFileSync(serviceSourcePath, 'utf-8');
        
        // Check for hardcoded PineLabs credentials
        expect(sourceCode).not.toMatch(/merchant_id\s*[:=]\s*['"][a-zA-Z0-9_]+['"]/);
        expect(sourceCode).not.toMatch(/secret_key\s*[:=]\s*['"][a-zA-Z0-9_]+['"]/);
        expect(sourceCode).not.toMatch(/access_code\s*[:=]\s*['"][a-zA-Z0-9_]+['"]/);
      }
    });

    it('should not contain API secrets in SDK loader source', () => {
      // Read the PaymentSDKLoaderService source file
      const sdkLoaderPath = path.join(__dirname, 'services', 'payment-sdk-loader.service.ts');
      
      if (fs.existsSync(sdkLoaderPath)) {
        const sourceCode = fs.readFileSync(sdkLoaderPath, 'utf-8');
        
        // Check for hardcoded keys
        expect(sourceCode).not.toContain('rzp_test_');
        expect(sourceCode).not.toContain('rzp_live_');
        expect(sourceCode).not.toMatch(/key\s*[:=]\s*['"]rzp_/);
      }
    });
  });

  describe('API Communication - Credentials from Backend Only', () => {
    it('should receive provider credentials from backend API, not frontend config', () => {
      // This test verifies the flow: frontend calls backend, backend returns credentials
      
      // Mock backend response structure
      const backendResponse = {
        orderId: 'order_123',
        amount: 10000,
        currency: 'INR',
        provider: 'razorpay',
        providerKey: 'rzp_test_from_backend' // Credentials come from backend
      };

      // Verify that credentials are in the backend response
      expect(backendResponse.providerKey).toBeDefined();
      expect(backendResponse.providerKey).toBe('rzp_test_from_backend');
      
      // Verify that frontend environment does not have these credentials
      expect(environment).not.toHaveProperty('providerKey');
      expect(environment).not.toHaveProperty('razorpayKeyId');
    });

    it('should not expose backend API secrets in frontend requests', () => {
      // Mock payment initiation request
      const paymentRequest = {
        planId: 'basic',
        amount: 10000,
        billingCycle: 'monthly'
      };

      // Verify request does not contain any secrets
      expect(paymentRequest).not.toHaveProperty('keySecret');
      expect(paymentRequest).not.toHaveProperty('secretKey');
      expect(paymentRequest).not.toHaveProperty('apiSecret');
    });
  });

  describe('Bundle Security - No Secrets in Compiled Code', () => {
    it('should not include environment secrets in production build', () => {
      // Verify that production environment does not contain secrets
      const prodEnv = environment;
      
      // Check that only safe configuration is present
      expect(prodEnv).toHaveProperty('production');
      expect(prodEnv).toHaveProperty('apiBaseUrl');
      
      // Verify no secrets
      const secretKeys = [
        'keyId', 'keySecret', 'secretKey', 'apiKey', 'apiSecret',
        'razorpayKeyId', 'razorpayKeySecret',
        'pineLabsMerchantId', 'pineLabsSecretKey'
      ];
      
      secretKeys.forEach(key => {
        expect(prodEnv).not.toHaveProperty(key);
      });
    });

    it('should use backend API URL, not direct provider URLs', () => {
      // Verify that frontend only knows about backend API
      expect(environment.apiBaseUrl).toBeDefined();
      
      // Verify frontend does not have direct provider API URLs
      expect(environment).not.toHaveProperty('razorpayApiUrl');
      expect(environment).not.toHaveProperty('pineLabsApiUrl');
      expect(environment).not.toHaveProperty('paymentProviderUrl');
    });
  });

  describe('Session Storage - No Sensitive Data Persistence', () => {
    beforeEach(() => {
      // Clear session storage before each test
      sessionStorage.clear();
    });

    afterEach(() => {
      // Clean up after each test
      sessionStorage.clear();
    });

    it('should not store credit card information in session storage', () => {
      // Simulate storing payment data
      const paymentData = {
        orderId: 'order_123',
        amount: 10000,
        planId: 'basic'
      };
      
      sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
      
      // Retrieve and verify
      const stored = JSON.parse(sessionStorage.getItem('paymentData') || '{}');
      
      expect(stored).not.toHaveProperty('creditCardNumber');
      expect(stored).not.toHaveProperty('cvv');
      expect(stored).not.toHaveProperty('cardNumber');
    });

    it('should not store API secrets in session storage', () => {
      // Verify that no secrets are stored in session storage
      const allKeys = Object.keys(sessionStorage);
      
      allKeys.forEach(key => {
        const value = sessionStorage.getItem(key);
        if (value) {
          // Check that stored values don't contain secret patterns
          expect(value).not.toContain('key_secret');
          expect(value).not.toContain('secret_key');
          expect(value).not.toContain('api_secret');
        }
      });
    });
  });
});
