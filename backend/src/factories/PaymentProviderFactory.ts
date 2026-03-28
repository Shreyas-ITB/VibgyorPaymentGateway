/**
 * Payment Provider Factory
 * Creates the appropriate payment provider based on environment configuration
 */

import { IPaymentProvider } from '../interfaces/IPaymentProvider';
import { RazorpayProvider } from '../providers/RazorpayProvider';
import { PineLabsProvider } from '../providers/PineLabsProvider';

export class PaymentProviderFactory {
  /**
   * Create a payment provider instance based on PAYMENT_PROVIDER environment variable
   * @returns IPaymentProvider instance
   * @throws Error if PAYMENT_PROVIDER is not set or invalid
   */
  static createProvider(): IPaymentProvider {
    const provider = process.env.PAYMENT_PROVIDER;

    if (!provider) {
      throw new Error('PAYMENT_PROVIDER environment variable is not set');
    }

    switch (provider.toLowerCase()) {
      case 'razorpay':
        return new RazorpayProvider();
      
      case 'pinelabs':
        return new PineLabsProvider();
      
      default:
        throw new Error(`Invalid payment provider: ${provider}. Must be 'razorpay' or 'pinelabs'`);
    }
  }
}
