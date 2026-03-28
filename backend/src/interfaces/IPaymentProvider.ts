/**
 * Payment Provider Interface
 * Defines the contract that all payment providers must implement
 */

export interface OrderResponse {
  orderId: string;
  amount: number;
  currency: string;
}

export interface IPaymentProvider {
  /**
   * Create a payment order with the provider
   * @param amount - Amount in smallest currency unit (e.g., paise for INR)
   * @param currency - Currency code (e.g., 'INR', 'USD')
   * @param metadata - Additional metadata for the order
   * @returns Promise resolving to OrderResponse
   */
  createOrder(amount: number, currency: string, metadata: any): Promise<OrderResponse>;

  /**
   * Verify a payment signature
   * @param orderId - The order ID from the provider
   * @param paymentId - The payment ID from the provider
   * @param signature - The signature to verify
   * @returns Promise resolving to boolean indicating if payment is valid
   */
  verifyPayment(orderId: string, paymentId: string, signature: string): Promise<boolean>;

  /**
   * Get the provider's public key for frontend integration
   * @returns The public key or merchant ID
   */
  getProviderKey(): string;
}
