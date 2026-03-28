/**
 * Unit tests for SubscriptionService
 */

import { SubscriptionService } from './SubscriptionService';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  beforeEach(() => {
    service = new SubscriptionService();
  });

  describe('generateSubscriptionId', () => {
    it('should generate a valid UUID v4', () => {
      const id = service.generateSubscriptionId();
      
      expect(uuidValidate(id)).toBe(true);
      expect(uuidVersion(id)).toBe(4);
    });

    it('should generate unique IDs', () => {
      const id1 = service.generateSubscriptionId();
      const id2 = service.generateSubscriptionId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription with valid data', () => {
      const planId = 'basic';
      const amount = 999;

      const subscription = service.createSubscription(planId, amount);

      expect(subscription.subscriptionId).toBeDefined();
      expect(uuidValidate(subscription.subscriptionId)).toBe(true);
      expect(subscription.planId).toBe(planId);
      expect(subscription.amount).toBe(amount);
      expect(subscription.status).toBe('completed');
      expect(subscription.createdAt).toBeInstanceOf(Date);
    });

    it('should store the subscription in memory', () => {
      const planId = 'pro';
      const amount = 2999;

      const subscription = service.createSubscription(planId, amount);
      const retrieved = service.getSubscription(subscription.subscriptionId);

      expect(retrieved).toEqual(subscription);
    });

    it('should create multiple subscriptions with unique IDs', () => {
      const sub1 = service.createSubscription('basic', 999);
      const sub2 = service.createSubscription('pro', 2999);

      expect(sub1.subscriptionId).not.toBe(sub2.subscriptionId);
      expect(service.getSubscription(sub1.subscriptionId)).toEqual(sub1);
      expect(service.getSubscription(sub2.subscriptionId)).toEqual(sub2);
    });

    it('should track payment ID for idempotency when provided', () => {
      const planId = 'basic';
      const amount = 999;
      const paymentId = 'pay_test123';

      const subscription = service.createSubscription(planId, amount, paymentId);

      expect(subscription.subscriptionId).toBeDefined();
      
      // Should be able to retrieve by payment ID
      const retrieved = service.getSubscriptionByPaymentId(paymentId);
      expect(retrieved).toEqual(subscription);
    });
  });

  describe('getSubscription', () => {
    it('should return null for non-existent subscription', () => {
      const result = service.getSubscription('non-existent-id');
      
      expect(result).toBeNull();
    });

    it('should retrieve an existing subscription', () => {
      const subscription = service.createSubscription('enterprise', 5999);
      const retrieved = service.getSubscription(subscription.subscriptionId);

      expect(retrieved).toEqual(subscription);
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return empty array when no subscriptions exist', () => {
      const subscriptions = service.getAllSubscriptions();
      
      expect(subscriptions).toEqual([]);
    });

    it('should return all created subscriptions', () => {
      const sub1 = service.createSubscription('basic', 999);
      const sub2 = service.createSubscription('pro', 2999);
      const sub3 = service.createSubscription('enterprise', 5999);

      const subscriptions = service.getAllSubscriptions();

      expect(subscriptions).toHaveLength(3);
      expect(subscriptions).toContainEqual(sub1);
      expect(subscriptions).toContainEqual(sub2);
      expect(subscriptions).toContainEqual(sub3);
    });
  });

  describe('clearSubscriptions', () => {
    it('should remove all subscriptions', () => {
      service.createSubscription('basic', 999);
      service.createSubscription('pro', 2999);

      expect(service.getAllSubscriptions()).toHaveLength(2);

      service.clearSubscriptions();

      expect(service.getAllSubscriptions()).toEqual([]);
    });

    it('should clear payment ID tracking', () => {
      const paymentId = 'pay_test123';
      service.createSubscription('basic', 999, paymentId);

      expect(service.getSubscriptionByPaymentId(paymentId)).not.toBeNull();

      service.clearSubscriptions();

      expect(service.getSubscriptionByPaymentId(paymentId)).toBeNull();
    });
  });

  describe('getSubscriptionByPaymentId', () => {
    it('should return null for non-existent payment ID', () => {
      const result = service.getSubscriptionByPaymentId('non-existent-payment-id');
      
      expect(result).toBeNull();
    });

    it('should retrieve subscription by payment ID', () => {
      const paymentId = 'pay_test456';
      const subscription = service.createSubscription('pro', 2999, paymentId);

      const retrieved = service.getSubscriptionByPaymentId(paymentId);

      expect(retrieved).toEqual(subscription);
    });

    it('should return null when subscription created without payment ID', () => {
      service.createSubscription('basic', 999);

      const result = service.getSubscriptionByPaymentId('any-payment-id');
      
      expect(result).toBeNull();
    });

    it('should handle multiple subscriptions with different payment IDs', () => {
      const sub1 = service.createSubscription('basic', 999, 'pay_001');
      const sub2 = service.createSubscription('pro', 2999, 'pay_002');

      expect(service.getSubscriptionByPaymentId('pay_001')).toEqual(sub1);
      expect(service.getSubscriptionByPaymentId('pay_002')).toEqual(sub2);
    });
  });
});
