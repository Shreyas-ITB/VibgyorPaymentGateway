/**
 * Payment Order Model
 * Represents a payment order in the system
 */

export interface PaymentOrder {
  orderId: string;
  planId: string;
  amount: number;
  currency: string;
  provider: 'razorpay' | 'pinelabs';
  status: 'created' | 'completed' | 'failed';
  createdAt: Date;
}
