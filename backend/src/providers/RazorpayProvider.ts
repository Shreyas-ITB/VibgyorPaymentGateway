/**
 * Razorpay Payment Provider Implementation
 * Implements IPaymentProvider interface for Razorpay payment processing
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import axios from 'axios';
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

  /**
   * Create a payment link using Razorpay Payment Links REST API
   * @param amount - Amount in smallest currency unit (paise for INR)
   * @param currency - Currency code (e.g., 'INR')
   * @param customer - Customer details
   * @param description - Description of the payment
   * @param referenceId - Unique reference ID for the payment link
   * @param callbackUrl - URL to redirect after payment completion
   * @returns Promise resolving to payment link details
   */
  async createPaymentLink(
    amount: number,
    currency: string,
    customer: { name: string; email: string; contact: string },
    description: string,
    referenceId: string,
    callbackUrl?: string
  ): Promise<any> {
    try {
      // Set expiry to 7 days from now
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      const expireBy = Math.floor(expiryDate.getTime() / 1000);

      const options: any = {
        amount,
        currency,
        description,
        customer: {
          name: customer.name,
          email: customer.email,
          contact: customer.contact
        },
        reference_id: referenceId,
        expire_by: expireBy,
        reminder_enable: true
      };

      if (callbackUrl) {
        options.callback_url = callbackUrl;
        options.callback_method = 'get';
      }

      // Use Razorpay REST API directly
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      
      const response = await axios.post(
        'https://api.razorpay.com/v1/payment_links',
        options,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const paymentLink = response.data;

      return {
        id: paymentLink.id,
        shortUrl: paymentLink.short_url,
        status: paymentLink.status,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        description: paymentLink.description,
        createdAt: new Date(paymentLink.created_at * 1000),
        expiresAt: new Date(paymentLink.expire_by * 1000),
        referenceId: paymentLink.reference_id
      };
    } catch (error: any) {
      console.error('Razorpay payment link creation error:', error.response?.data || error.message);
      throw new Error(`Failed to create Razorpay payment link: ${error.response?.data?.error?.description || error.message || 'Unknown error'}`);
    }
  }

  /**
   * Verify webhook signature for payment link events
   * @param webhookBody - The raw webhook request body
   * @param signature - The X-Razorpay-Signature header value
   * @returns boolean indicating if webhook is authentic
   */
  verifyWebhookSignature(webhookBody: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(webhookBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch payment link status from Razorpay
   * @param paymentLinkId - The payment link ID
   * @returns Promise resolving to payment link details
   */
  async fetchPaymentLinkStatus(paymentLinkId: string): Promise<any> {
    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      
      const response = await axios.get(
        `https://api.razorpay.com/v1/payment_links/${paymentLinkId}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error fetching payment link status:', error.response?.data || error.message);
      throw new Error(`Failed to fetch payment link status: ${error.response?.data?.error?.description || error.message || 'Unknown error'}`);
    }
  }
}
