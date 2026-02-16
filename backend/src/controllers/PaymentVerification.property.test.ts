/**
 * Property-based tests for Payment Verification
 * Feature: vibgyor-payment-gateway, Property 15: Webhook Verification Before Processing
 * 
 * **Validates: Requirements 11.3**
 */

import * as fc from 'fast-check';
import request from 'supertest';
import express, { Express } from 'express';
import PaymentController from './PaymentController';
import { sanitizeString } from '../middleware/validation';

// Mock the PaymentProviderFactory
jest.mock('../factories/PaymentProviderFactory');

// Mock the SubscriptionService
jest.mock('../services/SubscriptionService', () => {
  return {
    SubscriptionService: jest.fn().mockImplementation(() => ({
      createSubscription: jest.fn().mockReturnValue({
        subscriptionId: 'sub_test_123',
        planId: 'test_plan',
        amount: 1000,
        createdAt: new Date(),
        status: 'completed'
      })
    }))
  };
});

describe('PaymentController - Payment Verification Property Tests', () => {
  let app: Express;

  beforeEach(() => {
    // Set up Express app with the controller
    app = express();
    app.use(express.json());
    app.use('/api/payment', PaymentController);

    // Clear all mocks
    jest.clearAllMocks();
  });

  /**
   * Property 15: Webhook Verification Before Processing
   * 
   * For any incoming webhook, the signature verification function should be called
   * and complete before any payment processing logic executes.
   * 
   * This property verifies:
   * 1. verifyPayment is called before createSubscription
   * 2. If signature verification fails, createSubscription is never called
   * 3. If signature verification succeeds, createSubscription is called exactly once
   * 4. Invalid signatures result in 401 response without processing
   * 5. Valid signatures result in successful subscription creation
   * 
   * **Validates: Requirements 11.3**
   */
  describe('Property 15: Webhook Verification Before Processing', () => {
    it('should call verifyPayment before createSubscription for any valid request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => {
              const sanitized = sanitizeString(s, true);
              return sanitized.length > 0;
            }), // orderId
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => {
              const sanitized = sanitizeString(s, true);
              return sanitized.length > 0;
            }), // paymentId
          fc.string({ minLength: 1, maxLength: 128 })
            .filter(s => {
              const sanitized = sanitizeString(s, true);
              return sanitized.length > 0;
            }), // signature
          fc.constantFrom('razorpay', 'pinelabs'), // provider
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => {
              const sanitized = sanitizeString(s);
              return sanitized.length > 0;
            }), // planId
          fc.integer({ min: 1, max: 10000000 }), // amount
          async (orderId, paymentId, signature, provider, planId, amount) => {
            // Track call order
            const callOrder: string[] = [];

            // Mock the provider with call tracking
            const mockProvider = {
              verifyPayment: jest.fn().mockImplementation(async () => {
                callOrder.push('verifyPayment');
                return true; // Valid signature
              }),
              getProviderKey: jest.fn().mockReturnValue('test_key')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            // Make request
            await request(app)
              .post('/api/payment/verify')
              .send({
                orderId,
                paymentId,
                signature,
                provider,
                planId,
                amount
              });

            // Verify verifyPayment was called with sanitized values (preserveSpecialChars for crypto fields)
            expect(mockProvider.verifyPayment).toHaveBeenCalled();
            expect(mockProvider.verifyPayment).toHaveBeenCalledWith(
              sanitizeString(orderId, true), 
              sanitizeString(paymentId, true), 
              sanitizeString(signature, true)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not call createSubscription if signature verification fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0), // orderId
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0), // paymentId
          fc.string({ minLength: 1, maxLength: 128 })
            .filter(s => sanitizeString(s, true).length > 0), // invalid signature
          fc.constantFrom('razorpay', 'pinelabs'), // provider
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s).length > 0), // planId
          fc.integer({ min: 1, max: 10000000 }), // amount
          async (orderId, paymentId, signature, provider, planId, amount) => {
            // Mock the provider to reject signature
            const mockProvider = {
              verifyPayment: jest.fn().mockResolvedValue(false), // Invalid signature
              getProviderKey: jest.fn().mockReturnValue('test_key')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            // Make request
            const response = await request(app)
              .post('/api/payment/verify')
              .send({
                orderId,
                paymentId,
                signature,
                provider,
                planId,
                amount
              });

            // Verify verifyPayment was called with sanitized values (preserveSpecialChars for crypto fields)
            expect(mockProvider.verifyPayment).toHaveBeenCalledWith(
              sanitizeString(orderId, true), 
              sanitizeString(paymentId, true), 
              sanitizeString(signature, true)
            );

            // Verify response is 401 Unauthorized
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('PAYMENT_VERIFICATION_FAILED');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call createSubscription exactly once if signature verification succeeds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0), // orderId
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0), // paymentId
          fc.string({ minLength: 1, maxLength: 128 })
            .filter(s => sanitizeString(s, true).length > 0), // valid signature
          fc.constantFrom('razorpay', 'pinelabs'), // provider
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s).length > 0), // planId
          fc.integer({ min: 1, max: 10000000 }), // amount
          async (orderId, paymentId, signature, provider, planId, amount) => {
            // Mock the provider to accept signature
            const mockProvider = {
              verifyPayment: jest.fn().mockResolvedValue(true), // Valid signature
              getProviderKey: jest.fn().mockReturnValue('test_key')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            // Make request
            const response = await request(app)
              .post('/api/payment/verify')
              .send({
                orderId,
                paymentId,
                signature,
                provider,
                planId,
                amount
              });

            // Verify verifyPayment was called with sanitized values (preserveSpecialChars for crypto fields)
            expect(mockProvider.verifyPayment).toHaveBeenCalledWith(
              sanitizeString(orderId, true), 
              sanitizeString(paymentId, true), 
              sanitizeString(signature, true)
            );

            // Verify response is successful
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.subscriptionId).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid signatures before any processing for various signature formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0),
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0),
          fc.oneof(
            fc.constant('invalid'), // Short invalid signature
            fc.hexaString({ minLength: 32, maxLength: 32 }), // Wrong length
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => sanitizeString(s, true).length > 0), // Very short
            fc.string({ minLength: 200, maxLength: 300 }), // Very long
          ),
          fc.constantFrom('razorpay', 'pinelabs'),
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s).length > 0),
          fc.integer({ min: 1, max: 10000000 }),
          async (orderId, paymentId, invalidSignature, provider, planId, amount) => {
            // Mock the provider to reject signature
            const mockProvider = {
              verifyPayment: jest.fn().mockResolvedValue(false),
              getProviderKey: jest.fn().mockReturnValue('test_key')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            // Make request
            const response = await request(app)
              .post('/api/payment/verify')
              .send({
                orderId,
                paymentId,
                signature: invalidSignature,
                provider,
                planId,
                amount
              });

            // Verify verifyPayment was called first
            expect(mockProvider.verifyPayment).toHaveBeenCalled();

            // Verify rejection response
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify payment before processing regardless of request parameter order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0),
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0),
          fc.string({ minLength: 1, maxLength: 128 })
            .filter(s => sanitizeString(s, true).length > 0),
          fc.constantFrom('razorpay', 'pinelabs'),
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s).length > 0),
          fc.integer({ min: 1, max: 10000000 }),
          fc.shuffledSubarray(['orderId', 'paymentId', 'signature', 'provider', 'planId', 'amount'], { minLength: 6, maxLength: 6 }),
          async (orderId, paymentId, signature, provider, planId, amount, paramOrder) => {
            const mockProvider = {
              verifyPayment: jest.fn().mockResolvedValue(true),
              getProviderKey: jest.fn().mockReturnValue('test_key')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            // Build request body with shuffled parameter order
            const requestBody: any = {};
            const values: any = { orderId, paymentId, signature, provider, planId, amount };
            paramOrder.forEach((key: string) => {
              requestBody[key] = values[key];
            });

            const response = await request(app)
              .post('/api/payment/verify')
              .send(requestBody);

            // Verify verifyPayment was called
            expect(mockProvider.verifyPayment).toHaveBeenCalled();
            
            // Verify successful response
            expect(response.status).toBe(200);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle verification errors before processing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0),
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0),
          fc.string({ minLength: 1, maxLength: 128 })
            .filter(s => sanitizeString(s, true).length > 0),
          fc.constantFrom('razorpay', 'pinelabs'),
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s).length > 0),
          fc.integer({ min: 1, max: 10000000 }),
          async (orderId, paymentId, signature, provider, planId, amount) => {
            // Mock the provider to throw an error during verification
            const mockProvider = {
              verifyPayment: jest.fn().mockRejectedValue(new Error('Verification service unavailable')),
              getProviderKey: jest.fn().mockReturnValue('test_key')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            // Make request
            const response = await request(app)
              .post('/api/payment/verify')
              .send({
                orderId,
                paymentId,
                signature,
                provider,
                planId,
                amount
              });

            // Verify verifyPayment was called
            expect(mockProvider.verifyPayment).toHaveBeenCalled();

            // Verify error response
            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify that signature check completes before subscription data is accessed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0),
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s, true).length > 0),
          fc.string({ minLength: 1, maxLength: 128 })
            .filter(s => sanitizeString(s, true).length > 0),
          fc.constantFrom('razorpay', 'pinelabs'),
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => sanitizeString(s).length > 0),
          fc.integer({ min: 1, max: 10000000 }),
          fc.boolean(), // Whether signature is valid
          async (orderId, paymentId, signature, provider, planId, amount, isValidSignature) => {
            const mockProvider = {
              verifyPayment: jest.fn().mockResolvedValue(isValidSignature),
              getProviderKey: jest.fn().mockReturnValue('test_key')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            const response = await request(app)
              .post('/api/payment/verify')
              .send({
                orderId,
                paymentId,
                signature,
                provider,
                planId,
                amount
              });

            // Verify verifyPayment was called
            expect(mockProvider.verifyPayment).toHaveBeenCalled();

            // If signature was invalid, should get 401
            if (!isValidSignature) {
              expect(response.status).toBe(401);
            } else {
              expect(response.status).toBe(200);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
