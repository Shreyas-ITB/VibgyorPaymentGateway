/**
 * Validation schemas for API endpoints
 * Validates: Requirements 1.4
 */

import { ValidationSchema } from './validation';

/**
 * Schema for POST /api/payment/initiate
 */
export const initiatePaymentSchema: ValidationSchema = {
  planId: {
    type: 'string',
    required: true,
    min: 1,
    max: 100
  },
  amount: {
    type: 'number',
    required: true,
    min: 1
  },
  billingCycle: {
    type: 'string',
    required: true,
    enum: ['monthly', 'annual']
  }
};

/**
 * Schema for POST /api/payment/verify
 */
export const verifyPaymentSchema: ValidationSchema = {
  orderId: {
    type: 'string',
    required: true,
    min: 1,
    max: 200
  },
  paymentId: {
    type: 'string',
    required: true,
    min: 1,
    max: 200
  },
  signature: {
    type: 'string',
    required: true,
    min: 1,
    max: 500
  },
  provider: {
    type: 'string',
    required: true,
    enum: ['razorpay', 'pinelabs']
  },
  planId: {
    type: 'string',
    required: true,
    min: 1,
    max: 100
  },
  amount: {
    type: 'number',
    required: true,
    min: 1
  }
};
