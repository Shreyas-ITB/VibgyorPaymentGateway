/**
 * Razorpay Payment Provider Implementation
 * Implements IPaymentProvider interface for Razorpay payment processing
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { IPaymentProvider, OrderResponse } from '../interfaces/IPaymentProvider';

export class RazorpayProvider implements IPaymentProvider {
  private razorpayInstance: Razorpay;
  private keyId: string;
  private keySecret: string;

  constructor() {
    // Load credentials from environment variables
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    // Validate that credentials are present
    if (!this.keyId || !this.keySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables');
    }

    // Initialize Razorpay SDK
    // Note: Razorpay SDK uses HTTPS by default for all API calls
    this.razorpayInstance = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  /**
   * Create a payment order using Razorpay SDK
   * @param amount - Amount in smallest currency unit (paise for INR)
   * @param currency - Currency code (e.g., 'INR')
   * @param metadata - Additional metadata for the order
   * @returns Promise resolving to OrderResponse
   */
  async createOrder(amount: number, currency: string, metadata: any): Promise<OrderResponse> {
    try {
      const options = {
        amount,
        currency,
        receipt: metadata?.receipt || `receipt_${Date.now()}`,
        notes: metadata?.notes || {},
      };

      const order = await this.razorpayInstance.orders.create(options);

      return {
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
      };
    } catch (error) {
      throw new Error(`Failed to create Razorpay order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify payment signature using Razorpay's signature verification
   * @param orderId - The order ID from Razorpay
   * @param paymentId - The payment ID from Razorpay
   * @param signature - The signature to verify
   * @returns Promise resolving to boolean indicating if payment is valid
   */
  async verifyPayment(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    try {
      // Create the expected signature using HMAC SHA256
      const body = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(body)
        .digest('hex');

      // Compare signatures using timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      );
    } catch (error) {
      // If comparison fails (e.g., invalid signature format), return false
      return false;
    }
  }

  /**
   * Get the Razorpay public key for frontend integration
   * @returns The Razorpay key ID (public key)
   */
  getProviderKey(): string {
    return this.keyId;
  }
}
