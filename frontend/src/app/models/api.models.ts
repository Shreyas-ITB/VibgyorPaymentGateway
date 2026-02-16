/**
 * API request and response types for the Vibgyor Payment Gateway
 * These interfaces define the structure of data exchanged with the backend
 */

/**
 * Request payload for initiating a payment
 */
export interface InitiatePaymentRequest {
  planId: string;
  amount: number;
  billingCycle: 'monthly' | 'annual';
}

/**
 * Response from payment initiation endpoint
 */
export interface InitiatePaymentResponse {
  orderId: string;
  amount: number;
  currency: string;
  provider: 'razorpay' | 'pinelabs';
  providerKey: string;
}

/**
 * Request payload for verifying a payment
 */
export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  provider: 'razorpay' | 'pinelabs';
  planId: string;
  amount: number;
}

/**
 * Response from payment verification endpoint
 */
export interface VerifyPaymentResponse {
  success: boolean;
  subscriptionId: string;
  amount: number;
  planId: string;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Error codes used in API responses
 */
export enum ErrorCode {
  INVALID_JSON = 'INVALID_JSON',
  PAYMENT_INIT_FAILED = 'PAYMENT_INIT_FAILED',
  PAYMENT_VERIFICATION_FAILED = 'PAYMENT_VERIFICATION_FAILED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  STORAGE_ERROR = 'STORAGE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}
