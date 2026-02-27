/**
 * Payment-related data models for the Vibgyor Payment Gateway
 * These interfaces define the structure of payment requests and responses
 */

/**
 * Response from payment initiation API
 * Contains order details and provider information needed to launch payment interface
 */
export interface PaymentInitResponse {
  orderId: string;
  amount: number;
  currency: string;
  provider: 'razorpay' | 'pinelabs';
  providerKey: string;
}

/**
 * Response from payment verification API
 * Contains subscription details after successful payment verification
 */
export interface PaymentVerifyResponse {
  success: boolean;
  subscriptionId: string;
  amount: number;
  planId: string;
}

/**
 * Subscription data for redirect after successful payment
 * Used to construct query parameters for external site redirect
 */
export interface SubscriptionData {
  subscription_id: string;
  amount: number;
  subscription_plan_id: string;
}
