/**
 * Unit tests for API request/response models
 */

import {
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  ErrorResponse,
  ErrorCode
} from './api.models';

describe('API Models', () => {
  describe('InitiatePaymentRequest', () => {
    it('should accept valid monthly payment request', () => {
      const request: InitiatePaymentRequest = {
        planId: 'basic',
        amount: 999,
        billingCycle: 'monthly'
      };

      expect(request.planId).toBe('basic');
      expect(request.amount).toBe(999);
      expect(request.billingCycle).toBe('monthly');
    });

    it('should accept valid annual payment request', () => {
      const request: InitiatePaymentRequest = {
        planId: 'pro',
        amount: 19990,
        billingCycle: 'annual'
      };

      expect(request.billingCycle).toBe('annual');
    });
  });

  describe('InitiatePaymentResponse', () => {
    it('should accept valid payment initiation response', () => {
      const response: InitiatePaymentResponse = {
        orderId: 'order_123',
        amount: 999,
        currency: 'INR',
        provider: 'razorpay',
        providerKey: 'rzp_test_key'
      };

      expect(response.orderId).toBe('order_123');
      expect(response.provider).toBe('razorpay');
    });
  });

  describe('VerifyPaymentRequest', () => {
    it('should accept valid Razorpay verification request', () => {
      const request: VerifyPaymentRequest = {
        orderId: 'order_123',
        paymentId: 'pay_456',
        signature: 'sig_789',
        provider: 'razorpay',
        planId: 'basic',
        amount: 2999
      };

      expect(request.orderId).toBe('order_123');
      expect(request.paymentId).toBe('pay_456');
      expect(request.signature).toBe('sig_789');
      expect(request.provider).toBe('razorpay');
    });

    it('should accept valid PineLabs verification request', () => {
      const request: VerifyPaymentRequest = {
        orderId: 'pl_order_123',
        paymentId: 'pl_pay_456',
        signature: 'pl_sig_789',
        provider: 'pinelabs',
        planId: 'pro',
        amount: 4999
      };

      expect(request.provider).toBe('pinelabs');
    });
  });

  describe('VerifyPaymentResponse', () => {
    it('should accept successful verification response', () => {
      const response: VerifyPaymentResponse = {
        success: true,
        subscriptionId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 999,
        planId: 'basic'
      };

      expect(response.success).toBe(true);
      expect(response.subscriptionId).toBeTruthy();
    });
  });

  describe('ErrorResponse', () => {
    it('should accept valid error response', () => {
      const error: ErrorResponse = {
        success: false,
        error: {
          code: 'PAYMENT_INIT_FAILED',
          message: 'Failed to initialize payment',
          details: { reason: 'Invalid credentials' }
        }
      };

      expect(error.success).toBe(false);
      expect(error.error.code).toBe('PAYMENT_INIT_FAILED');
      expect(error.error.message).toBe('Failed to initialize payment');
    });

    it('should accept error response without details', () => {
      const error: ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON format'
        }
      };

      expect(error.error.details).toBeUndefined();
    });
  });

  describe('ErrorCode', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCode.INVALID_JSON).toBe('INVALID_JSON');
      expect(ErrorCode.PAYMENT_INIT_FAILED).toBe('PAYMENT_INIT_FAILED');
      expect(ErrorCode.PAYMENT_VERIFICATION_FAILED).toBe('PAYMENT_VERIFICATION_FAILED');
      expect(ErrorCode.PROVIDER_ERROR).toBe('PROVIDER_ERROR');
      expect(ErrorCode.INVALID_SIGNATURE).toBe('INVALID_SIGNATURE');
      expect(ErrorCode.STORAGE_ERROR).toBe('STORAGE_ERROR');
      expect(ErrorCode.CONFIGURATION_ERROR).toBe('CONFIGURATION_ERROR');
    });
  });
});
