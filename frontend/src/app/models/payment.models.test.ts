/**
 * Unit tests for payment data models
 */

import { PaymentInitResponse, PaymentVerifyResponse, SubscriptionData } from './payment.models';

describe('Payment Models', () => {
  describe('PaymentInitResponse', () => {
    it('should accept valid Razorpay payment init response', () => {
      const response: PaymentInitResponse = {
        orderId: 'order_123456',
        amount: 999,
        currency: 'INR',
        provider: 'razorpay',
        providerKey: 'rzp_test_key123'
      };

      expect(response.orderId).toBe('order_123456');
      expect(response.provider).toBe('razorpay');
      expect(response.amount).toBe(999);
    });

    it('should accept valid PineLabs payment init response', () => {
      const response: PaymentInitResponse = {
        orderId: 'pl_order_789',
        amount: 1999,
        currency: 'INR',
        provider: 'pinelabs',
        providerKey: 'merchant_id_123'
      };

      expect(response.orderId).toBe('pl_order_789');
      expect(response.provider).toBe('pinelabs');
      expect(response.amount).toBe(1999);
    });
  });

  describe('PaymentVerifyResponse', () => {
    it('should accept successful verification response', () => {
      const response: PaymentVerifyResponse = {
        success: true,
        subscriptionId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 999,
        planId: 'basic'
      };

      expect(response.success).toBe(true);
      expect(response.subscriptionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(response.amount).toBe(999);
      expect(response.planId).toBe('basic');
    });

    it('should accept failed verification response', () => {
      const response: PaymentVerifyResponse = {
        success: false,
        subscriptionId: '',
        amount: 0,
        planId: ''
      };

      expect(response.success).toBe(false);
    });
  });

  describe('SubscriptionData', () => {
    it('should accept valid subscription data', () => {
      const data: SubscriptionData = {
        subscription_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 999,
        subscription_plan_id: 'basic'
      };

      expect(data.subscription_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(data.amount).toBe(999);
      expect(data.subscription_plan_id).toBe('basic');
    });
  });
});
