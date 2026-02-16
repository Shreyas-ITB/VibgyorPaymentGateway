import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import {
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  ErrorResponse
} from '../models/api.models';
import { SubscriptionData } from '../models/payment.models';
import { API_BASE_URL } from '../config/api.config';
import { PaymentSDKLoaderService } from './payment-sdk-loader.service';

/**
 * PaymentService handles communication with the backend for payment operations
 * Implements methods for initiating payments, verifying payments, and handling redirects
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly apiBaseUrl: string;
  private readonly maxRetries = 3;
  private readonly initialRetryDelay = 1000; // 1 second

  constructor(
    private http: HttpClient,
    private sdkLoader: PaymentSDKLoaderService
  ) {
    // Get API base URL from configuration
    this.apiBaseUrl = API_BASE_URL;
  }

  /**
   * Retry strategy with exponential backoff
   * Retries network errors with increasing delays: 1s, 2s, 4s
   * @param maxRetries - Maximum number of retry attempts
   * @returns Retry configuration function
   */
  private retryWithBackoff<T>(maxRetries: number = this.maxRetries) {
    return retry<T>({
      count: maxRetries,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // Only retry on network errors (status 0) or 5xx server errors
        if (error.status === 0 || (error.status >= 500 && error.status < 600)) {
          const delay = this.initialRetryDelay * Math.pow(2, retryCount - 1);
          console.log(`Retrying request (attempt ${retryCount}/${maxRetries}) after ${delay}ms...`);
          return timer(delay);
        }
        // Don't retry on client errors (4xx) or other errors
        throw error;
      }
    });
  }

  /**
   * Initiate a payment by calling the backend API
   * Includes retry logic with exponential backoff for network errors
   * @param planId - The ID of the selected pricing plan
   * @param amount - The payment amount
   * @param billingCycle - The billing cycle (monthly or annual)
   * @returns Observable with payment initiation response
   */
  initiatePayment(
    planId: string,
    amount: number,
    billingCycle: 'monthly' | 'annual'
  ): Observable<InitiatePaymentResponse> {
    const request: InitiatePaymentRequest = {
      planId,
      amount,
      billingCycle
    };

    return this.http
      .post<InitiatePaymentResponse>(`${this.apiBaseUrl}/api/payment/initiate`, request)
      .pipe(
        this.retryWithBackoff<InitiatePaymentResponse>(),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Initiate payment flow: call backend, receive credentials, launch provider UI
   * @param planId - The ID of the selected pricing plan
   * @param amount - The payment amount
   * @param billingCycle - The billing cycle (monthly or annual)
   * @param redirectUrl - The URL to redirect to after payment
   * @returns Promise that resolves with subscription data on success
   */
  initiatePaymentFlow(
    planId: string,
    amount: number,
    billingCycle: 'monthly' | 'annual',
    redirectUrl: string
  ): Promise<SubscriptionData> {
    return new Promise((resolve, reject) => {
      // Step 1: Call backend to initiate payment
      this.initiatePayment(planId, amount, billingCycle).subscribe({
        next: (response: InitiatePaymentResponse) => {
          // Step 2: Launch payment provider UI with credentials
          this.sdkLoader.launchPaymentUI({
            orderId: response.orderId,
            amount: response.amount,
            currency: response.currency,
            providerKey: response.providerKey,
            provider: response.provider,
            onSuccess: (paymentResponse: any) => {
              // Step 3: Handle payment success callback
              // Pass planId and amount for verification
              this.handlePaymentSuccessCallback(
                paymentResponse.orderId,
                paymentResponse.paymentId,
                paymentResponse.signature,
                response.provider,
                planId,
                amount,
                redirectUrl
              ).then(resolve).catch(reject);
            },
            onFailure: (error: any) => {
              // Step 4: Handle payment failure callback
              this.handlePaymentFailureCallback(error, redirectUrl);
              reject(new Error(error.error || 'Payment failed'));
            }
          });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Handle payment success callback from provider
   * Verifies payment with backend and returns subscription data
   * @param orderId - The order ID
   * @param paymentId - The payment ID from provider
   * @param signature - The payment signature from provider
   * @param provider - The payment provider
   * @param planId - The plan ID from initiation
   * @param amount - The amount from initiation
   * @param redirectUrl - The URL to redirect to
   * @returns Promise with subscription data
   */
  private handlePaymentSuccessCallback(
    orderId: string,
    paymentId: string,
    signature: string,
    provider: 'razorpay' | 'pinelabs',
    planId: string,
    amount: number,
    redirectUrl: string
  ): Promise<SubscriptionData> {
    return new Promise((resolve, reject) => {
      this.verifyPayment(orderId, paymentId, signature, provider, planId, amount).subscribe({
        next: (response: VerifyPaymentResponse) => {
          if (response.success) {
            const subscriptionData: SubscriptionData = {
              subscription_id: response.subscriptionId,
              amount: response.amount,
              subscription_plan_id: response.planId
            };
            
            // Redirect to external site with subscription data
            this.handlePaymentSuccess(subscriptionData, redirectUrl);
            resolve(subscriptionData);
          } else {
            reject(new Error('Payment verification failed'));
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Handle payment failure callback from provider
   * Redirects to external site with error information
   * @param error - The error from payment provider
   * @param redirectUrl - The URL to redirect to
   */
  private handlePaymentFailureCallback(error: any, redirectUrl: string): void {
    const errorMessage = error.error || error.reason || 'Payment failed';
    this.handlePaymentFailure(errorMessage, redirectUrl);
  }

  /**
   * Verify a payment by calling the backend API
   * Includes retry logic with exponential backoff for network errors
   * @param orderId - The order ID from payment initiation
   * @param paymentId - The payment ID from payment provider
   * @param signature - The payment signature from payment provider
   * @param provider - The payment provider (razorpay or pinelabs)
   * @param planId - The plan ID from payment initiation
   * @param amount - The amount from payment initiation
   * @returns Observable with payment verification response
   */
  verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
    provider: 'razorpay' | 'pinelabs',
    planId: string,
    amount: number
  ): Observable<VerifyPaymentResponse> {
    const request: VerifyPaymentRequest = {
      orderId,
      paymentId,
      signature,
      provider,
      planId,
      amount
    };

    console.log('Sending verification request:', request);

    return this.http
      .post<VerifyPaymentResponse>(`${this.apiBaseUrl}/api/payment/verify`, request)
      .pipe(
        this.retryWithBackoff<VerifyPaymentResponse>(),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Handle successful payment by redirecting to the external site with subscription data
   * @param subscriptionData - The subscription data to include in redirect
   * @param redirectUrl - The URL to redirect to
   */
  handlePaymentSuccess(subscriptionData: SubscriptionData, redirectUrl: string): void {
    // Construct redirect URL with subscription data as query parameters
    const url = new URL(redirectUrl);
    url.searchParams.append('subscription_id', subscriptionData.subscription_id);
    url.searchParams.append('amount', subscriptionData.amount.toString());
    url.searchParams.append('subscription_plan_id', subscriptionData.subscription_plan_id);

    // Redirect to external site
    window.location.href = url.toString();
  }

  /**
   * Handle payment failure by redirecting to the external site with error information
   * @param error - The error message or reason for failure
   * @param redirectUrl - The URL to redirect to
   */
  handlePaymentFailure(error: string, redirectUrl: string): void {
    // Construct redirect URL with error parameter
    const url = new URL(redirectUrl);
    url.searchParams.append('error', error);
    url.searchParams.append('payment_status', 'failed');

    // Redirect to external site
    window.location.href = url.toString();
  }

  /**
   * Handle HTTP errors from API calls
   * Provides user-friendly error messages for different error types
   * @param error - The HTTP error response
   * @returns Observable that throws a user-friendly error message
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = 'Connection error. Please check your internet connection and try again.';
    } else if (error.status === 0) {
      // Network error (no response from server)
      errorMessage = 'Unable to connect to the payment service. Please check your internet connection and try again.';
    } else if (error.status >= 500 && error.status < 600) {
      // Server error
      errorMessage = 'Payment service is temporarily unavailable. Please try again in a few moments.';
    } else if (error.status >= 400 && error.status < 500) {
      // Client error - use backend error message if available
      const errorResponse = error.error as ErrorResponse;
      if (errorResponse && errorResponse.error) {
        errorMessage = errorResponse.error.message;
      } else {
        errorMessage = 'Unable to process your request. Please try again.';
      }
    } else {
      // Other errors
      const errorResponse = error.error as ErrorResponse;
      if (errorResponse && errorResponse.error) {
        errorMessage = errorResponse.error.message;
      } else {
        errorMessage = `An error occurred: ${error.status} ${error.statusText}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
