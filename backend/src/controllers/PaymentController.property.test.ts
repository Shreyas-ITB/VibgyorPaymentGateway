/**
 * Property-based tests for PaymentController
 * Feature: vibgyor-payment-gateway, Property 7: Payment Order Creation
 * 
 * **Validates: Requirements 5.5**
 */

import * as fc from 'fast-check';
import request from 'supertest';
import express, { Express } from 'express';
import PaymentController from './PaymentController';
import { sanitizeString } from '../middleware/validation';

// Mock the PaymentProviderFactory
jest.mock('../factories/PaymentProviderFactory');

describe('PaymentController - Property Tests', () => {
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
   * Property 7: Payment Order Creation
   * 
   * For any valid payment initiation request, the backend should create a payment order
   * with the configured provider and return an order response containing orderId, amount,
   * currency, provider name, and provider key.
   * 
   * This property verifies:
   * 1. Valid requests always return a successful response (200 status)
   * 2. Response contains all required fields: orderId, amount, currency, provider, providerKey
   * 3. Response amount matches the request amount
   * 4. Response provider matches the configured provider
   * 5. All fields have the correct types and non-empty values
   */
  describe('Property 7: Payment Order Creation', () => {
    it('should return valid payment order for any valid request with Razorpay', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => {
              const sanitized = sanitizeString(s);
              return sanitized.length > 0;
            }), // planId
          fc.integer({ min: 1, max: 10000000 }), // amount
          fc.constantFrom('monthly', 'annual'), // billingCycle
          async (planId, amount, billingCycle) => {
            // Mock the provider
            const mockOrderId = `order_${Math.random().toString(36).substring(7)}`;
            const mockProvider = {
              createOrder: jest.fn().mockResolvedValue({
                orderId: mockOrderId,
                amount: amount,
                currency: 'INR'
              }),
              getProviderKey: jest.fn().mockReturnValue('rzp_test_key')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            // Set environment variable
            process.env.PAYMENT_PROVIDER = 'razorpay';

            // Make request
            const response = await request(app)
              .post('/api/payment/initiate')
              .send({
                planId,
                amount,
                billingCycle
              });

            // Verify response status
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify response contains all required fields
            expect(response.body.data).toBeDefined();
            expect(response.body.data.orderId).toBeDefined();
            expect(response.body.data.amount).toBeDefined();
            expect(response.body.data.currency).toBeDefined();
            expect(response.body.data.provider).toBeDefined();
            expect(response.body.data.providerKey).toBeDefined();

            // Verify field types and values
            expect(typeof response.body.data.orderId).toBe('string');
            expect(response.body.data.orderId.length).toBeGreaterThan(0);
            
            expect(typeof response.body.data.amount).toBe('number');
            expect(response.body.data.amount).toBe(amount);
            
            expect(typeof response.body.data.currency).toBe('string');
            expect(response.body.data.currency).toBe('INR');
            
            expect(typeof response.body.data.provider).toBe('string');
            expect(response.body.data.provider).toBe('razorpay');
            
            expect(typeof response.body.data.providerKey).toBe('string');
            expect(response.body.data.providerKey.length).toBeGreaterThan(0);

            // Verify provider was called with correct parameters (sanitized values)
            expect(mockProvider.createOrder).toHaveBeenCalledWith(
              amount,
              'INR',
              {
                planId: sanitizeString(planId),
                billingCycle
              }
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid payment order for any valid request with PineLabs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => {
              const sanitized = sanitizeString(s);
              return sanitized.length > 0;
            }), // planId
          fc.integer({ min: 1, max: 10000000 }), // amount
          fc.constantFrom('monthly', 'annual'), // billingCycle
          async (planId, amount, billingCycle) => {
            // Mock the provider
            const mockOrderId = `pl_order_${Math.random().toString(36).substring(7)}`;
            const mockProvider = {
              createOrder: jest.fn().mockResolvedValue({
                orderId: mockOrderId,
                amount: amount,
                currency: 'INR'
              }),
              getProviderKey: jest.fn().mockReturnValue('test_merchant_id')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            // Set environment variable
            process.env.PAYMENT_PROVIDER = 'pinelabs';

            // Make request
            const response = await request(app)
              .post('/api/payment/initiate')
              .send({
                planId,
                amount,
                billingCycle
              });

            // Verify response status
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify response contains all required fields
            expect(response.body.data).toBeDefined();
            expect(response.body.data.orderId).toBeDefined();
            expect(response.body.data.amount).toBeDefined();
            expect(response.body.data.currency).toBeDefined();
            expect(response.body.data.provider).toBeDefined();
            expect(response.body.data.providerKey).toBeDefined();

            // Verify field types and values
            expect(typeof response.body.data.orderId).toBe('string');
            expect(response.body.data.orderId.length).toBeGreaterThan(0);
            
            expect(typeof response.body.data.amount).toBe('number');
            expect(response.body.data.amount).toBe(amount);
            
            expect(typeof response.body.data.currency).toBe('string');
            expect(response.body.data.currency).toBe('INR');
            
            expect(typeof response.body.data.provider).toBe('string');
            expect(response.body.data.provider).toBe('pinelabs');
            
            expect(typeof response.body.data.providerKey).toBe('string');
            expect(response.body.data.providerKey.length).toBeGreaterThan(0);

            // Verify provider was called with correct parameters (sanitized values)
            expect(mockProvider.createOrder).toHaveBeenCalledWith(
              amount,
              'INR',
              {
                planId: sanitizeString(planId),
                billingCycle
              }
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle various plan ID formats correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('basic'),
            fc.constant('pro'),
            fc.constant('enterprise'),
            fc.constant('custom-plan-123'),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          ),
          fc.integer({ min: 100, max: 1000000 }),
          fc.constantFrom('monthly', 'annual'),
          async (planId, amount, billingCycle) => {
            // Mock the provider
            const mockProvider = {
              createOrder: jest.fn().mockResolvedValue({
                orderId: 'order_test',
                amount: amount,
                currency: 'INR'
              }),
              getProviderKey: jest.fn().mockReturnValue('test_key')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            process.env.PAYMENT_PROVIDER = 'razorpay';

            const response = await request(app)
              .post('/api/payment/initiate')
              .send({
                planId,
                amount,
                billingCycle
              });

            // Should succeed for any valid plan ID
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.orderId).toBeDefined();
            expect(response.body.data.amount).toBe(amount);

            // Verify the plan ID was passed to the provider (sanitized)
            expect(mockProvider.createOrder).toHaveBeenCalledWith(
              amount,
              'INR',
              expect.objectContaining({
                planId: sanitizeString(planId)
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case amounts correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(1), // Minimum amount
            fc.constant(100),
            fc.constant(999),
            fc.constant(9999),
            fc.constant(99999),
            fc.constant(999999),
            fc.integer({ min: 1, max: 10000000 })
          ),
          async (amount) => {
            // Mock the provider
            const mockProvider = {
              createOrder: jest.fn().mockResolvedValue({
                orderId: 'order_test',
                amount: amount,
                currency: 'INR'
              }),
              getProviderKey: jest.fn().mockReturnValue('test_key')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            process.env.PAYMENT_PROVIDER = 'razorpay';

            const response = await request(app)
              .post('/api/payment/initiate')
              .send({
                planId: 'test-plan',
                amount,
                billingCycle: 'monthly'
              });

            // Should succeed for any positive amount
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.amount).toBe(amount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve metadata in provider call', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => {
              const sanitized = sanitizeString(s);
              return sanitized.length > 0;
            }),
          fc.integer({ min: 1, max: 10000000 }),
          fc.constantFrom('monthly', 'annual'),
          async (planId, amount, billingCycle) => {
            // Mock the provider
            const mockProvider = {
              createOrder: jest.fn().mockResolvedValue({
                orderId: 'order_test',
                amount: amount,
                currency: 'INR'
              }),
              getProviderKey: jest.fn().mockReturnValue('test_key')
            };

            const { PaymentProviderFactory } = require('../factories/PaymentProviderFactory');
            PaymentProviderFactory.createProvider = jest.fn().mockReturnValue(mockProvider);

            process.env.PAYMENT_PROVIDER = 'razorpay';

            await request(app)
              .post('/api/payment/initiate')
              .send({
                planId,
                amount,
                billingCycle
              });

            // Verify metadata is passed correctly to provider (sanitized values)
            expect(mockProvider.createOrder).toHaveBeenCalledWith(
              amount,
              'INR',
              {
                planId: sanitizeString(planId),
                billingCycle: billingCycle
              }
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
