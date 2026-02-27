import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';
import { PaymentSDKLoaderService } from './payment-sdk-loader.service';
import {
  InitiatePaymentResponse,
  VerifyPaymentResponse,
  ErrorResponse,
  ErrorCode
} from '../models/api.models';
import { SubscriptionData } from '../models/payment.models';

// Mock the API config module
jest.mock('../config/api.config', () => ({
  API_BASE_URL: 'http://localhost:3000'
}));

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;
  let sdkLoaderService: PaymentSDKLoaderService;
  const apiBaseUrl = 'http://localhost:3000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PaymentService, PaymentSDKLoaderService]
    });

    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
    sdkLoaderService = TestBed.inject(PaymentSDKLoaderService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('initiatePayment', () => {
    it('should call backend API with correct request data', (done) => {
      const planId = 'basic';
      const amount = 999;
      const billingCycle = 'monthly';

      const mockResponse: InitiatePaymentResponse = {
        orderId: 'order_123',
        amount: 999,
        currency: 'INR',
        provider: 'razorpay',
        providerKey: 'rzp_test_key'
      };

      service.initiatePayment(planId, amount, billingCycle).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        planId,
        amount,
        billingCycle
      });

      req.flush(mockResponse);
    });

    it('should handle API errors gracefully', (done) => {
      jest.useFakeTimers();

      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.PAYMENT_INIT_FAILED,
          message: 'Failed to create payment order'
        }
      };

      service.initiatePayment('basic', 999, 'monthly').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          // Error message is transformed by handleError for 500 errors
          expect(error.message).toBe('Payment service is temporarily unavailable. Please try again in a few moments.');
          jest.useRealTimers();
          done();
        }
      });

      // Initial attempt
      const req1 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req1.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });

      // Retry 1 after 1000ms
      jest.advanceTimersByTime(1000);
      const req2 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req2.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });

      // Retry 2 after 2000ms
      jest.advanceTimersByTime(2000);
      const req3 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req3.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });

      // Retry 3 after 4000ms
      jest.advanceTimersByTime(4000);
      const req4 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req4.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('verifyPayment', () => {
    it('should call backend API with correct verification data', (done) => {
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      const signature = 'sig_789';
      const provider = 'razorpay';

      const mockResponse: VerifyPaymentResponse = {
        success: true,
        subscriptionId: 'sub_abc123',
        amount: 999,
        planId: 'basic'
      };

      service.verifyPayment(orderId, paymentId, signature, provider, 'basic', 999).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/payment/verify`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        orderId,
        paymentId,
        signature,
        provider,
        planId: 'basic',
        amount: 999
      });

      req.flush(mockResponse);
    });

    it('should handle verification failures', (done) => {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.PAYMENT_VERIFICATION_FAILED,
          message: 'Invalid payment signature'
        }
      };

      service.verifyPayment('order_123', 'pay_456', 'invalid_sig', 'razorpay', 'basic', 999).subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Invalid payment signature');
          done();
        }
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/payment/verify`);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should redirect to external site with subscription data', () => {
      const subscriptionData: SubscriptionData = {
        subscription_id: 'sub_abc123',
        amount: 999,
        subscription_plan_id: 'basic'
      };
      const redirectUrl = 'https://example.com/callback';

      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      service.handlePaymentSuccess(subscriptionData, redirectUrl);

      const expectedUrl = new URL(redirectUrl);
      expectedUrl.searchParams.append('subscription_id', 'sub_abc123');
      expectedUrl.searchParams.append('amount', '999');
      expectedUrl.searchParams.append('subscription_plan_id', 'basic');

      expect(window.location.href).toBe(expectedUrl.toString());
    });

    it('should preserve existing query parameters in redirect URL', () => {
      const subscriptionData: SubscriptionData = {
        subscription_id: 'sub_xyz',
        amount: 2999,
        subscription_plan_id: 'pro'
      };
      const redirectUrl = 'https://example.com/callback?existing=param';

      delete (window as any).location;
      (window as any).location = { href: '' };

      service.handlePaymentSuccess(subscriptionData, redirectUrl);

      const url = new URL(window.location.href);
      expect(url.searchParams.get('existing')).toBe('param');
      expect(url.searchParams.get('subscription_id')).toBe('sub_xyz');
      expect(url.searchParams.get('amount')).toBe('2999');
      expect(url.searchParams.get('subscription_plan_id')).toBe('pro');
    });
  });

  describe('handlePaymentFailure', () => {
    it('should redirect to external site with error information', () => {
      const error = 'Payment declined by bank';
      const redirectUrl = 'https://example.com/callback';

      delete (window as any).location;
      (window as any).location = { href: '' };

      service.handlePaymentFailure(error, redirectUrl);

      const expectedUrl = new URL(redirectUrl);
      expectedUrl.searchParams.append('error', 'Payment declined by bank');
      expectedUrl.searchParams.append('payment_status', 'failed');

      expect(window.location.href).toBe(expectedUrl.toString());
    });

    it('should handle special characters in error messages', () => {
      const error = 'Payment failed: Invalid card & expired';
      const redirectUrl = 'https://example.com/callback';

      delete (window as any).location;
      (window as any).location = { href: '' };

      service.handlePaymentFailure(error, redirectUrl);

      const url = new URL(window.location.href);
      expect(url.searchParams.get('error')).toBe('Payment failed: Invalid card & expired');
      expect(url.searchParams.get('payment_status')).toBe('failed');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle network errors', (done) => {
      service.initiatePayment('basic', 999, 'monthly').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Unable to connect to the payment service');
          done();
        }
      });

      // Initial attempt
      const req1 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req1.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

      // Retry 1 after 1000ms
      jest.advanceTimersByTime(1000);
      const req2 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req2.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

      // Retry 2 after 2000ms
      jest.advanceTimersByTime(2000);
      const req3 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req3.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

      // Retry 3 after 4000ms
      jest.advanceTimersByTime(4000);
      const req4 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req4.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    });

    it('should handle server errors without error response body', (done) => {
      service.initiatePayment('basic', 999, 'monthly').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Payment service is temporarily unavailable');
          done();
        }
      });

      // Initial attempt
      const req1 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req1.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Retry 1 after 1000ms
      jest.advanceTimersByTime(1000);
      const req2 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req2.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Retry 2 after 2000ms
      jest.advanceTimersByTime(2000);
      const req3 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req3.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

      // Retry 3 after 4000ms
      jest.advanceTimersByTime(4000);
      const req4 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req4.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should provide user-friendly error message for client errors', (done) => {
      service.initiatePayment('basic', 999, 'monthly').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Unable to process your request. Please try again.');
          done();
        }
      });

      // Client errors (4xx) should not retry - only one request
      const req = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('retry logic with exponential backoff', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry network errors with exponential backoff', (done) => {
      const mockResponse: InitiatePaymentResponse = {
        orderId: 'order_123',
        amount: 999,
        currency: 'INR',
        provider: 'razorpay',
        providerKey: 'rzp_test_key'
      };

      let attemptCount = 0;

      service.initiatePayment('basic', 999, 'monthly').subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          expect(attemptCount).toBe(3); // Initial + 2 retries
          done();
        },
        error: done.fail
      });

      // First attempt - network error
      const req1 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      attemptCount++;
      req1.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

      // Wait for first retry delay (1000ms)
      jest.advanceTimersByTime(1000);

      // Second attempt - network error
      const req2 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      attemptCount++;
      req2.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

      // Wait for second retry delay (2000ms)
      jest.advanceTimersByTime(2000);

      // Third attempt - success
      const req3 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      attemptCount++;
      req3.flush(mockResponse);
    });

    it('should retry 5xx server errors with exponential backoff', (done) => {
      const mockResponse: VerifyPaymentResponse = {
        success: true,
        subscriptionId: 'sub_abc123',
        amount: 999,
        planId: 'basic'
      };

      let attemptCount = 0;

      service.verifyPayment('order_123', 'pay_456', 'sig_789', 'razorpay', 'basic', 999).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          expect(attemptCount).toBe(2); // Initial + 1 retry
          done();
        },
        error: done.fail
      });

      // First attempt - 503 error
      const req1 = httpMock.expectOne(`${apiBaseUrl}/api/payment/verify`);
      attemptCount++;
      req1.flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });

      // Wait for first retry delay (1000ms)
      jest.advanceTimersByTime(1000);

      // Second attempt - success
      const req2 = httpMock.expectOne(`${apiBaseUrl}/api/payment/verify`);
      attemptCount++;
      req2.flush(mockResponse);
    });

    it('should not retry 4xx client errors', (done) => {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.PAYMENT_INIT_FAILED,
          message: 'Invalid request data'
        }
      };

      service.initiatePayment('basic', 999, 'monthly').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Invalid request data');
          done();
        }
      });

      // Only one request should be made (no retries for 4xx)
      const req = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });

      // Advance timers to ensure no retry happens
      jest.advanceTimersByTime(5000);
    });

    it('should fail after maximum retry attempts', (done) => {
      let attemptCount = 0;

      service.initiatePayment('basic', 999, 'monthly').subscribe({
        next: () => done.fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('Unable to connect to the payment service');
          expect(attemptCount).toBe(4); // Initial + 3 retries
          done();
        }
      });

      // Initial attempt
      const req1 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      attemptCount++;
      req1.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

      // First retry after 1000ms
      jest.advanceTimersByTime(1000);
      const req2 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      attemptCount++;
      req2.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

      // Second retry after 2000ms
      jest.advanceTimersByTime(2000);
      const req3 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      attemptCount++;
      req3.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

      // Third retry after 4000ms
      jest.advanceTimersByTime(4000);
      const req4 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      attemptCount++;
      req4.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });
    });

    it('should use exponential backoff delays: 1s, 2s, 4s', (done) => {
      const consoleSpy = jest.spyOn(console, 'log');

      service.initiatePayment('basic', 999, 'monthly').subscribe({
        next: () => done.fail('Should have failed'),
        error: () => {
          // Verify console logs show exponential backoff
          expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('after 1000ms'));
          expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('after 2000ms'));
          expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('after 4000ms'));
          consoleSpy.mockRestore();
          done();
        }
      });

      // Initial attempt
      const req1 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req1.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

      jest.advanceTimersByTime(1000);
      const req2 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req2.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

      jest.advanceTimersByTime(2000);
      const req3 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req3.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

      jest.advanceTimersByTime(4000);
      const req4 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req4.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });
    });
  });

  describe('initiatePaymentFlow', () => {
    it('should complete full payment flow successfully', async () => {
      const planId = 'basic';
      const amount = 999;
      const billingCycle = 'monthly';
      const redirectUrl = 'https://example.com/callback';

      const mockInitResponse: InitiatePaymentResponse = {
        orderId: 'order_123',
        amount: 999,
        currency: 'INR',
        provider: 'razorpay',
        providerKey: 'rzp_test_key'
      };

      const mockVerifyResponse: VerifyPaymentResponse = {
        success: true,
        subscriptionId: 'sub_abc123',
        amount: 999,
        planId: 'basic'
      };

      // Mock SDK loader to immediately call success callback
      jest.spyOn(sdkLoaderService, 'launchPaymentUI').mockImplementation((options) => {
        setTimeout(() => {
          options.onSuccess({
            orderId: 'order_123',
            paymentId: 'pay_456',
            signature: 'sig_789'
          });
        }, 0);
      });

      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      const promise = service.initiatePaymentFlow(planId, amount, billingCycle, redirectUrl);

      // Handle initiate payment request
      const initReq = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      initReq.flush(mockInitResponse);

      // Wait for SDK callback
      await new Promise(resolve => setTimeout(resolve, 10));

      // Handle verify payment request
      const verifyReq = httpMock.expectOne(`${apiBaseUrl}/api/payment/verify`);
      verifyReq.flush(mockVerifyResponse);

      const result = await promise;

      expect(result).toEqual({
        subscription_id: 'sub_abc123',
        amount: 999,
        subscription_plan_id: 'basic'
      });

      // Verify redirect happened
      expect(window.location.href).toContain('subscription_id=sub_abc123');
    });

    it('should handle payment initiation failure', async () => {
      jest.useFakeTimers();

      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.PAYMENT_INIT_FAILED,
          message: 'Failed to create payment order'
        }
      };

      const promise = service.initiatePaymentFlow('basic', 999, 'monthly', 'https://example.com/callback');

      // Initial attempt
      const req1 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req1.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });

      // Retry 1 after 1000ms
      jest.advanceTimersByTime(1000);
      const req2 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req2.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });

      // Retry 2 after 2000ms
      jest.advanceTimersByTime(2000);
      const req3 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req3.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });

      // Retry 3 after 4000ms
      jest.advanceTimersByTime(4000);
      const req4 = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req4.flush(errorResponse, { status: 500, statusText: 'Internal Server Error' });

      // Error message is transformed by handleError for 500 errors
      await expect(promise).rejects.toThrow('Payment service is temporarily unavailable');
      jest.useRealTimers();
    });

    it('should handle payment provider failure', async () => {
      jest.useFakeTimers();

      const mockInitResponse: InitiatePaymentResponse = {
        orderId: 'order_123',
        amount: 999,
        currency: 'INR',
        provider: 'razorpay',
        providerKey: 'rzp_test_key'
      };

      // Mock SDK loader to call failure callback
      jest.spyOn(sdkLoaderService, 'launchPaymentUI').mockImplementation((options) => {
        setTimeout(() => {
          options.onFailure({
            error: 'Payment cancelled by user'
          });
        }, 0);
      });

      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      const promise = service.initiatePaymentFlow('basic', 999, 'monthly', 'https://example.com/callback');

      const req = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      req.flush(mockInitResponse);

      // Advance timers to trigger the setTimeout callback
      jest.advanceTimersByTime(10);

      await expect(promise).rejects.toThrow('Payment cancelled by user');

      // Verify redirect happened with error
      expect(window.location.href).toContain('error=Payment+cancelled+by+user');

      jest.useRealTimers();
    });

    it('should handle payment verification failure', async () => {
      jest.useFakeTimers();

      const mockInitResponse: InitiatePaymentResponse = {
        orderId: 'order_123',
        amount: 999,
        currency: 'INR',
        provider: 'razorpay',
        providerKey: 'rzp_test_key'
      };

      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.PAYMENT_VERIFICATION_FAILED,
          message: 'Invalid payment signature'
        }
      };

      // Mock SDK loader to call success callback
      jest.spyOn(sdkLoaderService, 'launchPaymentUI').mockImplementation((options) => {
        setTimeout(() => {
          options.onSuccess({
            orderId: 'order_123',
            paymentId: 'pay_456',
            signature: 'invalid_sig'
          });
        }, 0);
      });

      const promise = service.initiatePaymentFlow('basic', 999, 'monthly', 'https://example.com/callback');

      const initReq = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      initReq.flush(mockInitResponse);

      // Advance timers to trigger the setTimeout callback
      jest.advanceTimersByTime(10);

      const verifyReq = httpMock.expectOne(`${apiBaseUrl}/api/payment/verify`);
      verifyReq.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });

      await expect(promise).rejects.toThrow('Invalid payment signature');

      jest.useRealTimers();
    });

    it('should handle SDK loading failure', async () => {
      jest.useFakeTimers();

      const mockInitResponse: InitiatePaymentResponse = {
        orderId: 'order_123',
        amount: 999,
        currency: 'INR',
        provider: 'razorpay',
        providerKey: 'rzp_test_key'
      };

      // Mock SDK loader to call failure callback with SDK load error
      jest.spyOn(sdkLoaderService, 'launchPaymentUI').mockImplementation((options) => {
        setTimeout(() => {
          options.onFailure({
            error: 'Razorpay payment service failed to load. Please refresh the page and try again. If the problem persists, contact support.',
            code: 'SDK_LOAD_FAILED',
            provider: 'razorpay'
          });
        }, 0);
      });

      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      const promise = service.initiatePaymentFlow('basic', 999, 'monthly', 'https://example.com/callback');

      const initReq = httpMock.expectOne(`${apiBaseUrl}/api/payment/initiate`);
      initReq.flush(mockInitResponse);

      // Advance timers to trigger the setTimeout callback
      jest.advanceTimersByTime(10);

      await expect(promise).rejects.toThrow('Razorpay payment service failed to load');

      // Verify redirect happened with error
      expect(window.location.href).toContain('error=Razorpay+payment+service+failed+to+load');
      expect(window.location.href).toContain('payment_status=failed');

      jest.useRealTimers();
    });
  });
});
