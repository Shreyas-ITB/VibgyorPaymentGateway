/**
 * PineLabs (Plural Online) Payment Provider Implementation
 * Implements IPaymentProvider interface for PineLabs payment processing
 * 
 * Note: PineLabs uses Plural Online APIs which require:
 * - Client ID (Merchant ID)
 * - Client Secret (Secret Key)
 * - Access Code for authentication
 * 
 * Security: All API calls to PineLabs MUST use HTTPS protocol
 */

import crypto from 'crypto';
import { IPaymentProvider, OrderResponse } from '../interfaces/IPaymentProvider';

// PineLabs API base URL - HTTPS enforced
const PINELABS_API_BASE_URL = 'https://api.pluralonline.com';

export class PineLabsProvider implements IPaymentProvider {
  private merchantId: string;
  private accessCode: string;
  private secretKey: string;
  private apiBaseUrl: string;

  constructor() {
    // Load credentials from environment variables
    this.merchantId = process.env.PINELABS_MERCHANT_ID || '';
    this.accessCode = process.env.PINELABS_ACCESS_CODE || '';
    this.secretKey = process.env.PINELABS_SECRET_KEY || '';

    // Validate that credentials are present
    if (!this.merchantId || !this.accessCode || !this.secretKey) {
      throw new Error(
        'PINELABS_MERCHANT_ID, PINELABS_ACCESS_CODE, and PINELABS_SECRET_KEY must be set in environment variables'
      );
    }

    // Set API base URL - enforce HTTPS
    this.apiBaseUrl = process.env.PINELABS_API_URL || PINELABS_API_BASE_URL;
    
    // Validate that API URL uses HTTPS
    if (!this.apiBaseUrl.startsWith('https://')) {
      throw new Error('PineLabs API URL must use HTTPS protocol for security');
    }
  }

  /**
   * Create a payment order using PineLabs API
   * @param amount - Amount in smallest currency unit (paise for INR)
   * @param currency - Currency code (e.g., 'INR')
   * @param metadata - Additional metadata for the order
   * @returns Promise resolving to OrderResponse
   */
  async createOrder(amount: number, currency: string, metadata: any): Promise<OrderResponse> {
    try {
      // In production, this would prepare the order payload and make an HTTP request
      // to PineLabs API using HTTPS. For now, we return a mock order response.
      // The actual implementation would include:
      // - Generating unique merchant order reference from metadata?.receipt
      // - Preparing order payload with merchant_id, merchant_order_reference, order_amount, etc.
      // - Generating authentication hash
      // - Making POST request to ${this.apiBaseUrl}/api/v1/orders (HTTPS enforced)
      // - Parsing and returning the response
      
      // Generate unique order ID
      const orderId = `pl_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Note: metadata is available for future use when implementing actual API calls
      void metadata;

      return {
        orderId,
        amount,
        currency,
      };
    } catch (error) {
      throw new Error(
        `Failed to create PineLabs order: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verify payment signature using PineLabs verification mechanism
   * PineLabs uses HMAC SHA256 for signature verification
   * 
   * @param orderId - The order ID from PineLabs
   * @param paymentId - The payment ID from PineLabs
   * @param signature - The signature to verify
   * @returns Promise resolving to boolean indicating if payment is valid
   */
  async verifyPayment(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    try {
      // Create the expected signature using HMAC SHA256
      // PineLabs signature format: orderId|paymentId|merchantId
      const body = `${orderId}|${paymentId}|${this.merchantId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
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
   * Get the PineLabs merchant ID for frontend integration
   * @returns The merchant ID (public identifier)
   */
  getProviderKey(): string {
    return this.merchantId;
  }
}
