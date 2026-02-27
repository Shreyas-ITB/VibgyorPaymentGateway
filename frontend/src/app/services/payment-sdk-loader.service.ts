import { Injectable } from '@angular/core';

/**
 * Razorpay SDK interface
 */
declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Payment SDK options for launching provider UI
 */
export interface PaymentSDKOptions {
  orderId: string;
  amount: number;
  currency: string;
  providerKey: string;
  provider: 'razorpay' | 'pinelabs';
  onSuccess: (response: any) => void;
  onFailure: (error: any) => void;
}

/**
 * PaymentSDKLoaderService dynamically loads and launches the correct payment provider SDK
 * based on the backend response
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentSDKLoaderService {
  /**
   * Check if the Razorpay SDK is loaded
   * @returns true if Razorpay SDK is available, false otherwise
   */
  isRazorpaySDKLoaded(): boolean {
    return typeof window.Razorpay !== 'undefined' && window.Razorpay !== null;
  }

  /**
   * Check if the PineLabs SDK is loaded
   * @returns true if PineLabs SDK is available, false otherwise
   */
  isPineLabsSDKLoaded(): boolean {
    // PineLabs SDK check - update when PineLabs SDK is implemented
    return false;
  }

  /**
   * Detect if the required payment provider SDK has failed to load
   * @param provider - The payment provider to check
   * @returns true if SDK failed to load, false if loaded successfully
   */
  detectSDKLoadingFailure(provider: 'razorpay' | 'pinelabs'): boolean {
    if (provider === 'razorpay') {
      return !this.isRazorpaySDKLoaded();
    } else if (provider === 'pinelabs') {
      return !this.isPineLabsSDKLoaded();
    }
    return true; // Unknown provider = failure
  }

  /**
   * Launch the payment provider UI with the given options
   * @param options - Payment SDK options including provider, credentials, and callbacks
   */
  launchPaymentUI(options: PaymentSDKOptions): void {
    if (options.provider === 'razorpay') {
      this.launchRazorpay(options);
    } else if (options.provider === 'pinelabs') {
      this.launchPineLabs(options);
    } else {
      throw new Error(`Unsupported payment provider: ${options.provider}`);
    }
  }

  /**
   * Launch Razorpay payment UI
   * @param options - Payment SDK options
   */
  private launchRazorpay(options: PaymentSDKOptions): void {
    // Check if Razorpay SDK is loaded
    if (!this.isRazorpaySDKLoaded()) {
      const errorMessage = 'Razorpay payment service failed to load. Please refresh the page and try again. If the problem persists, contact support.';
      options.onFailure({ 
        error: errorMessage,
        code: 'SDK_LOAD_FAILED',
        provider: 'razorpay'
      });
      return;
    }

    const razorpayOptions = {
      key: options.providerKey,
      amount: options.amount,
      currency: options.currency,
      order_id: options.orderId,
      name: 'Vibgyor Payment Gateway',
      description: 'Subscription Payment',
      handler: (response: any) => {
        // Payment successful
        options.onSuccess({
          orderId: options.orderId,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature
        });
      },
      modal: {
        ondismiss: () => {
          // User closed the payment modal
          options.onFailure({ error: 'Payment cancelled by user' });
        }
      },
      theme: {
        color: '#ed4e00' // Orange color from design
      }
    };

    try {
      const razorpay = new window.Razorpay(razorpayOptions);
      
      razorpay.on('payment.failed', (response: any) => {
        // Payment failed
        options.onFailure({
          error: response.error.description || 'Payment failed',
          code: response.error.code,
          reason: response.error.reason
        });
      });

      razorpay.open();
    } catch (error: any) {
      // Handle SDK initialization errors
      const errorMessage = 'Failed to initialize payment service. Please refresh the page and try again.';
      options.onFailure({
        error: errorMessage,
        code: 'SDK_INIT_FAILED',
        provider: 'razorpay',
        details: error.message
      });
    }
  }

  /**
   * Launch PineLabs payment UI
   * @param options - Payment SDK options
   */
  private launchPineLabs(options: PaymentSDKOptions): void {
    // Check if PineLabs SDK is loaded
    if (!this.isPineLabsSDKLoaded()) {
      const errorMessage = 'PineLabs payment service failed to load. Please refresh the page and try again. If the problem persists, contact support.';
      options.onFailure({ 
        error: errorMessage,
        code: 'SDK_LOAD_FAILED',
        provider: 'pinelabs'
      });
      return;
    }

    // PineLabs typically uses server-side redirect flow
    // This is a placeholder implementation that would need to be updated
    // based on PineLabs' actual client-side SDK if available
    
    // For now, we'll handle this as a server-side redirect
    // The backend should provide a redirect URL in the response
    console.warn('PineLabs client-side SDK not yet implemented');
    options.onFailure({ 
      error: 'PineLabs integration not yet available',
      code: 'SDK_NOT_IMPLEMENTED',
      provider: 'pinelabs'
    });
  }
}
