/**
 * Property-based tests for SubscriptionService
 * Feature: vibgyor-payment-gateway, Property 9: Subscription ID Generation
 * 
 * **Validates: Requirements 6.4**
 */

import * as fc from 'fast-check';
import { SubscriptionService } from './SubscriptionService';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

describe('SubscriptionService - Property Tests', () => {
  let service: SubscriptionService;

  beforeEach(() => {
    service = new SubscriptionService();
  });

  /**
   * Property 9: Subscription ID Generation
   * 
   * For any successfully verified payment, the backend should generate a subscription_id
   * that is a valid UUID v4 format and is unique across all generated subscription IDs.
   * 
   * This property verifies:
   * 1. All generated IDs are valid UUID v4 format
   * 2. All generated IDs are unique (no duplicates)
   */
  describe('Property 9: Subscription ID Generation', () => {
    it('should generate valid UUID v4 format for any number of subscriptions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            const generatedIds: string[] = [];

            // Generate multiple subscription IDs
            for (let i = 0; i < count; i++) {
              const id = service.generateSubscriptionId();
              generatedIds.push(id);

              // Verify each ID is a valid UUID v4
              expect(uuidValidate(id)).toBe(true);
              expect(uuidVersion(id)).toBe(4);
            }

            // Verify all IDs are unique
            const uniqueIds = new Set(generatedIds);
            expect(uniqueIds.size).toBe(generatedIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique subscription IDs across multiple service instances', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 50 }),
          (count1, count2) => {
            const service1 = new SubscriptionService();
            const service2 = new SubscriptionService();
            const allIds: string[] = [];

            // Generate IDs from first service instance
            for (let i = 0; i < count1; i++) {
              const id = service1.generateSubscriptionId();
              allIds.push(id);
              expect(uuidValidate(id)).toBe(true);
              expect(uuidVersion(id)).toBe(4);
            }

            // Generate IDs from second service instance
            for (let i = 0; i < count2; i++) {
              const id = service2.generateSubscriptionId();
              allIds.push(id);
              expect(uuidValidate(id)).toBe(true);
              expect(uuidVersion(id)).toBe(4);
            }

            // Verify all IDs are unique across both instances
            const uniqueIds = new Set(allIds);
            expect(uniqueIds.size).toBe(allIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate valid UUID v4 IDs when creating subscriptions with arbitrary plan data', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              planId: fc.string({ minLength: 1, maxLength: 100 }),
              amount: fc.integer({ min: 1, max: 1000000 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (subscriptionData) => {
            const createdIds: string[] = [];

            // Create subscriptions with arbitrary plan data
            for (const data of subscriptionData) {
              const subscription = service.createSubscription(data.planId, data.amount);
              createdIds.push(subscription.subscriptionId);

              // Verify the subscription ID is valid UUID v4
              expect(uuidValidate(subscription.subscriptionId)).toBe(true);
              expect(uuidVersion(subscription.subscriptionId)).toBe(4);
            }

            // Verify all generated IDs are unique
            const uniqueIds = new Set(createdIds);
            expect(uniqueIds.size).toBe(createdIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain uniqueness even with rapid successive ID generation', () => {
      fc.assert(
        fc.property(
          fc.constant(1000), // Generate many IDs rapidly
          (count) => {
            const ids: string[] = [];

            // Generate IDs in rapid succession
            for (let i = 0; i < count; i++) {
              const id = service.generateSubscriptionId();
              ids.push(id);
            }

            // Verify all are valid UUID v4
            for (const id of ids) {
              expect(uuidValidate(id)).toBe(true);
              expect(uuidVersion(id)).toBe(4);
            }

            // Verify uniqueness
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(count);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Payment Data Storage Round Trip
   * 
   * For any successfully verified payment with subscription_id, amount, and subscription_plan_id,
   * storing the payment details and then retrieving them by subscription_id should produce
   * equivalent data.
   * 
   * This property verifies:
   * 1. Stored subscription data can be retrieved
   * 2. Retrieved data matches the original stored data
   * 3. All fields are preserved correctly (subscriptionId, planId, amount, status, createdAt)
   * 
   * **Validates: Requirements 6.5**
   */
  describe('Property 10: Payment Data Storage Round Trip', () => {
    it('should store and retrieve subscription data with equivalent results', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // planId
          fc.integer({ min: 1, max: 10000000 }), // amount
          (planId, amount) => {
            // Create a subscription (store the data)
            const storedSubscription = service.createSubscription(planId, amount);

            // Retrieve the subscription by its ID
            const retrievedSubscription = service.getSubscription(storedSubscription.subscriptionId);

            // Verify the subscription was retrieved
            expect(retrievedSubscription).not.toBeNull();

            // Verify all fields match exactly
            expect(retrievedSubscription!.subscriptionId).toBe(storedSubscription.subscriptionId);
            expect(retrievedSubscription!.planId).toBe(storedSubscription.planId);
            expect(retrievedSubscription!.amount).toBe(storedSubscription.amount);
            expect(retrievedSubscription!.status).toBe(storedSubscription.status);
            expect(retrievedSubscription!.createdAt).toEqual(storedSubscription.createdAt);

            // Verify the retrieved object is equivalent to the stored object
            expect(retrievedSubscription).toEqual(storedSubscription);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple subscriptions with independent storage and retrieval', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              planId: fc.string({ minLength: 1, maxLength: 100 }),
              amount: fc.integer({ min: 1, max: 10000000 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (subscriptionDataArray) => {
            // Clear any existing subscriptions to ensure clean state
            service.clearSubscriptions();

            const storedSubscriptions: any[] = [];

            // Store multiple subscriptions
            for (const data of subscriptionDataArray) {
              const subscription = service.createSubscription(data.planId, data.amount);
              storedSubscriptions.push(subscription);
            }

            // Retrieve each subscription and verify it matches
            for (const stored of storedSubscriptions) {
              const retrieved = service.getSubscription(stored.subscriptionId);

              expect(retrieved).not.toBeNull();
              expect(retrieved).toEqual(stored);
              expect(retrieved!.subscriptionId).toBe(stored.subscriptionId);
              expect(retrieved!.planId).toBe(stored.planId);
              expect(retrieved!.amount).toBe(stored.amount);
            }

            // Verify all subscriptions are still retrievable
            expect(service.getAllSubscriptions().length).toBe(subscriptionDataArray.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for non-existent subscription IDs', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // Generate random UUID that doesn't exist
          (nonExistentId) => {
            // Ensure the ID doesn't exist by clearing subscriptions
            service.clearSubscriptions();

            // Try to retrieve a non-existent subscription
            const result = service.getSubscription(nonExistentId);

            // Should return null
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve data integrity across multiple store and retrieve operations', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 10000000 }),
          (planId, amount) => {
            // Store a subscription
            const subscription1 = service.createSubscription(planId, amount);

            // Retrieve it multiple times
            const retrieved1 = service.getSubscription(subscription1.subscriptionId);
            const retrieved2 = service.getSubscription(subscription1.subscriptionId);
            const retrieved3 = service.getSubscription(subscription1.subscriptionId);

            // All retrievals should return the same data
            expect(retrieved1).toEqual(subscription1);
            expect(retrieved2).toEqual(subscription1);
            expect(retrieved3).toEqual(subscription1);

            // All retrievals should be equal to each other
            expect(retrieved1).toEqual(retrieved2);
            expect(retrieved2).toEqual(retrieved3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case amounts and plan IDs correctly', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('basic'),
            fc.constant('pro'),
            fc.constant('enterprise'),
            fc.string({ minLength: 1, maxLength: 200 })
          ),
          fc.oneof(
            fc.constant(1), // Minimum amount
            fc.constant(999),
            fc.constant(9999),
            fc.constant(99999),
            fc.integer({ min: 1, max: 10000000 })
          ),
          (planId, amount) => {
            // Create subscription with edge case values
            const stored = service.createSubscription(planId, amount);

            // Retrieve and verify
            const retrieved = service.getSubscription(stored.subscriptionId);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.planId).toBe(planId);
            expect(retrieved!.amount).toBe(amount);
            expect(retrieved).toEqual(stored);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
