/**
 * Subscription Record Model
 * Represents a completed subscription purchase
 */

export interface SubscriptionRecord {
  subscriptionId: string;
  planId: string;
  amount: number;
  createdAt: Date;
  status: 'pending' | 'completed' | 'failed';
}
