import { TestBed } from '@angular/core/testing';
import { PaymentSDKLoaderService, PaymentSDKOptions } from './payment-sdk-loader.service';

describe('PaymentSDKLoaderService', () => {
  let service: PaymentSDKLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentSDKLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('SDK Loading Detection', () => {
    it('should detect when Razorpay SDK is loaded', () => {
      (window as any).Razorpay = jest.fn();
      expect(service.isRazorpaySDKLoaded()).toBe(true);
    });

    it('should detect when Razorpay SDK is not loaded', () => {
      (window as any).Razorpay = undefined;
      expect(service.isRazorpaySDKLoaded()).toBe(false);
    });

    it('should detect when Razorpay SDK is null', () => {
      (window as any).Razorpay = null;
      expect(service.isRazorpaySDKLoaded()).toBe(false);
    });

    it('should detect PineLabs SDK loading failure', () => {
      expect(service.isPineLabsSDKLoaded()).toBe(false);
    });

    it('should detect SDK loading failure for Razorpay', () => {
      (window as any).Razorpay = undefined;
      expect(service.detectSDKLoadingFailure('razorpay')).toBe(true);
    });

    it('should detect SDK loading success for Razorpay', () => {
      (window as any).Razorpay = jest.fn();
      expect(service.detectSDKLoadingFailure('razorpay')).toBe(false);
    });

    it('should detect SDK loading failure for PineLabs', () => {
      expect(service.detectSDKLoadingFailure('pinelabs')).toBe(true);
    });

    it('should detect SDK loading failure for unknown provider', () => {
      expect(service.detectSDKLoadingFailure('unknown' as any)).toBe(true);
    });
  });

  describe('launchPaymentUI', () => {
    it('should throw error for unsupported provider', () => {
      const options: PaymentSDKOptions = {
        orderId: 'order_123',
        amount: 1000,
        currency: 'INR',
        providerKey: 'key_123',
        provider: 'unknown' as any,
        onSuccess: jest.fn(),
        onFailure: jest.fn()
      };

      expect(() => service.launchPaymentUI(options)).toThrow('Unsupported payment provider: unknown');
    });

    it('should call launchRazorpay for razorpay provider', () => {
      const mockRazorpay = {
        on: jest.fn(),
        open: jest.fn()
      };
      (window as any).Razorpay = jest.fn(() => mockRazorpay);

      const onSuccess = jest.fn();
      const onFailure = jest.fn();

      const options: PaymentSDKOptions = {
        orderId: 'order_123',
        amount: 100000,
        currency: 'INR',
        providerKey: 'rzp_test_key',
        provider: 'razorpay',
        onSuccess,
        onFailure
      };

      service.launchPaymentUI(options);

      expect(window.Razorpay).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'rzp_test_key',
          amount: 100000,
          currency: 'INR',
          order_id: 'order_123',
          name: 'Vibgyor Payment Gateway',
          theme: { color: '#ed4e00' }
        })
      );
      expect(mockRazorpay.open).toHaveBeenCalled();
    });

    it('should handle Razorpay SDK not loaded', () => {
      (window as any).Razorpay = undefined;

      const onSuccess = jest.fn();
      const onFailure = jest.fn();

      const options: PaymentSDKOptions = {
        orderId: 'order_123',
        amount: 100000,
        currency: 'INR',
        providerKey: 'rzp_test_key',
        provider: 'razorpay',
        onSuccess,
        onFailure
      };

      service.launchPaymentUI(options);

      expect(onFailure).toHaveBeenCalledWith({
        error: 'Razorpay payment service failed to load. Please refresh the page and try again. If the problem persists, contact support.',
        code: 'SDK_LOAD_FAILED',
        provider: 'razorpay'
      });
    });

    it('should handle Razorpay SDK initialization error', () => {
      const mockError = new Error('SDK initialization failed');
      (window as any).Razorpay = jest.fn(() => {
        throw mockError;
      });

      const onSuccess = jest.fn();
      const onFailure = jest.fn();

      const options: PaymentSDKOptions = {
        orderId: 'order_123',
        amount: 100000,
        currency: 'INR',
        providerKey: 'rzp_test_key',
        provider: 'razorpay',
        onSuccess,
        onFailure
      };

      service.launchPaymentUI(options);

      expect(onFailure).toHaveBeenCalledWith({
        error: 'Failed to initialize payment service. Please refresh the page and try again.',
        code: 'SDK_INIT_FAILED',
        provider: 'razorpay',
        details: 'SDK initialization failed'
      });
    });

    it('should handle Razorpay payment success', () => {
      const mockRazorpay = {
        on: jest.fn(),
        open: jest.fn()
      };
      let razorpayHandler: any;
      (window as any).Razorpay = jest.fn((opts) => {
        razorpayHandler = opts.handler;
        return mockRazorpay;
      });

      const onSuccess = jest.fn();
      const onFailure = jest.fn();

      const options: PaymentSDKOptions = {
        orderId: 'order_123',
        amount: 100000,
        currency: 'INR',
        providerKey: 'rzp_test_key',
        provider: 'razorpay',
        onSuccess,
        onFailure
      };

      service.launchPaymentUI(options);

      // Simulate Razorpay success callback
      razorpayHandler({
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123'
      });

      expect(onSuccess).toHaveBeenCalledWith({
        orderId: 'order_123',
        paymentId: 'pay_123',
        signature: 'sig_123'
      });
    });

    it('should handle Razorpay payment failure', () => {
      const mockRazorpay = {
        on: jest.fn((event, callback) => {
          if (event === 'payment.failed') {
            // Simulate payment failure
            setTimeout(() => {
              callback({
                error: {
                  code: 'BAD_REQUEST_ERROR',
                  description: 'Payment failed due to insufficient funds',
                  reason: 'payment_failed'
                }
              });
            }, 0);
          }
        }),
        open: jest.fn()
      };
      (window as any).Razorpay = jest.fn(() => mockRazorpay);

      const onSuccess = jest.fn();
      const onFailure = jest.fn();

      const options: PaymentSDKOptions = {
        orderId: 'order_123',
        amount: 100000,
        currency: 'INR',
        providerKey: 'rzp_test_key',
        provider: 'razorpay',
        onSuccess,
        onFailure
      };

      service.launchPaymentUI(options);

      // Wait for async callback
      setTimeout(() => {
        expect(onFailure).toHaveBeenCalledWith({
          error: 'Payment failed due to insufficient funds',
          code: 'BAD_REQUEST_ERROR',
          reason: 'payment_failed'
        });
      }, 10);
    });

    it('should handle Razorpay modal dismiss', () => {
      const mockRazorpay = {
        on: jest.fn(),
        open: jest.fn()
      };
      let dismissHandler: any;
      (window as any).Razorpay = jest.fn((opts) => {
        dismissHandler = opts.modal.ondismiss;
        return mockRazorpay;
      });

      const onSuccess = jest.fn();
      const onFailure = jest.fn();

      const options: PaymentSDKOptions = {
        orderId: 'order_123',
        amount: 100000,
        currency: 'INR',
        providerKey: 'rzp_test_key',
        provider: 'razorpay',
        onSuccess,
        onFailure
      };

      service.launchPaymentUI(options);

      // Simulate modal dismiss
      dismissHandler();

      expect(onFailure).toHaveBeenCalledWith({ error: 'Payment cancelled by user' });
    });

    it('should handle PineLabs provider with not implemented error', () => {
      const onSuccess = jest.fn();
      const onFailure = jest.fn();

      const options: PaymentSDKOptions = {
        orderId: 'order_123',
        amount: 100000,
        currency: 'INR',
        providerKey: 'pine_key',
        provider: 'pinelabs',
        onSuccess,
        onFailure
      };

      service.launchPaymentUI(options);

      expect(onFailure).toHaveBeenCalledWith({
        error: 'PineLabs payment service failed to load. Please refresh the page and try again. If the problem persists, contact support.',
        code: 'SDK_LOAD_FAILED',
        provider: 'pinelabs'
      });
    });

    it('should handle PineLabs SDK loading failure with detailed error', () => {
      const onSuccess = jest.fn();
      const onFailure = jest.fn();

      const options: PaymentSDKOptions = {
        orderId: 'order_456',
        amount: 50000,
        currency: 'INR',
        providerKey: 'pine_test_key',
        provider: 'pinelabs',
        onSuccess,
        onFailure
      };

      service.launchPaymentUI(options);

      expect(onFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SDK_LOAD_FAILED',
          provider: 'pinelabs'
        })
      );
    });
  });
});
