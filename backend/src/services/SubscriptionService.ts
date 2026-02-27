/**
 * Subscription Service
 * Handles subscription ID generation and subscription data management
 */

import { v4 as uuidv4 } from 'uuid';
import { SubscriptionRecord } from '../models';

export class SubscriptionService {
  private subscriptions: Map<string, SubscriptionRecord>;
  // Track payment IDs to prevent duplicate processing
  private paymentIdToSubscriptionId: Map<string, string>;

  constructor() {
    this.subscriptions = new Map();
    this.paymentIdToSubscriptionId = new Map();
  }

  /**
   * Generate a unique subscription ID using UUID v4
   * @returns A UUID v4 string
   */
  generateSubscriptionId(): string {
    return uuidv4();
  }

  /**
   * Create a new subscription record
   * @param planId - The plan identifier
   * @param amount - The subscription amount
   * @param paymentId - Optional payment ID for idempotency tracking
   * @returns The created subscription record
   */
  createSubscription(planId: string, amount: number, paymentId?: string): SubscriptionRecord {
    const subscriptionId = this.generateSubscriptionId();
    const subscription: SubscriptionRecord = {
      subscriptionId,
      planId,
      amount,
      createdAt: new Date(),
      status: 'completed'
    };

    this.subscriptions.set(subscriptionId, subscription);
    
    // Track payment ID for idempotency if provided
    if (paymentId) {
      this.paymentIdToSubscriptionId.set(paymentId, subscriptionId);
    }
    
    return subscription;
  }

  /**
   * Retrieve a subscription by its ID
   * @param subscriptionId - The subscription ID to look up
   * @returns The subscription record if found, null otherwise
   */
  getSubscription(subscriptionId: string): SubscriptionRecord | null {
    return this.subscriptions.get(subscriptionId) || null;
  }

  /**
   * Get all subscriptions (useful for testing)
   * @returns Array of all subscription records
   */
  getAllSubscriptions(): SubscriptionRecord[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Check if a subscription already exists for a given payment ID
   * @param paymentId - The payment ID to check
   * @returns The existing subscription record if found, null otherwise
   */
  getSubscriptionByPaymentId(paymentId: string): SubscriptionRecord | null {
    const subscriptionId = this.paymentIdToSubscriptionId.get(paymentId);
    if (!subscriptionId) {
      return null;
    }
    return this.subscriptions.get(subscriptionId) || null;
  }

  /**
   * Clear all subscriptions (useful for testing)
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
    this.paymentIdToSubscriptionId.clear();
  }
}
