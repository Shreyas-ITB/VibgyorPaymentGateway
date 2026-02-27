/**
 * Property-based tests for PricingPageComponent
 * Feature: vibgyor-payment-gateway, Property 6: Payment Initiation API Call
 * Feature: vibgyor-payment-gateway, Property 13: Contact Request Redirect
 * 
 * **Validates: Requirements 5.1, 9.1, 9.2, 9.3**
 */

import * as fc from 'fast-check';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PricingPageComponent } from './pricing-page.component';
import { PaymentService } from '../../services/payment.service';
import { parseAndStorePricingData, clearPricingData } from '../../services/pricing-data-parser.service';

// Mock the api.config module
jest.mock('../../config/api.config', () => ({
  API_BASE_URL: 'http://localhost:3000',
  getApiBaseUrl: () => 'http://localhost:3000'
}));

describe('PricingPageComponent - Property Tests', () => {
  let component: PricingPageComponent;
  let fixture: ComponentFixture<PricingPageComponent>;
  let paymentService: jest.Mocked<PaymentService>;

  beforeEach(async () => {
    const paymentServiceMock = {
      initiatePayment: jest.fn(),
      initiatePaymentFlow: jest.fn(),
      verifyPayment: jest.fn(),
      handlePaymentSuccess: jest.fn(),
      handlePaymentFailure: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PricingPageComponent, HttpClientTestingModule],
      providers: [
        { provide: PaymentService, useValue: paymentServiceMock }
      ]
    }).compileComponents();

    paymentService = TestBed.inject(PaymentService) as jest.Mocked<PaymentService>;
    fixture = TestBed.createComponent(PricingPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    clearPricingData();
    jest.clearAllMocks();
  });

  /**
   * Arbitrary generator for valid pricing plans (raw JSON format with underscores)
   */
  const validPricingPlanArbitrary = () =>
    fc.record({
      plan_id: fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
      name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      monthly_amount: fc.integer({ min: 1, max: 1000000 }),
      annual_amount: fc.integer({ min: 1, max: 10000000 }),
      features: fc.array(
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        { minLength: 1, maxLength: 20 }
      )
    });

  /**
   * Arbitrary generator for billing cycles
   */
  const billingCycleArbitrary = () =>
    fc.constantFrom('monthly' as const, 'annual' as const);

  /**
   * Arbitrary generator for valid pricing data with exactly 3 plans
   * Ensures unique plan_id values across all plans
   */
  const validPricingDataArbitrary = () =>
    fc.record({
      plans: fc.tuple(
        validPricingPlanArbitrary(),
        validPricingPlanArbitrary(),
        validPricingPlanArbitrary()
      ).map(([plan1, plan2, plan3]) => {
        // Ensure unique plan IDs by appending suffixes
        return [
          { ...plan1, plan_id: `${plan1.plan_id}_1` },
          { ...plan2, plan_id: `${plan2.plan_id}_2` },
          { ...plan3, plan_id: `${plan3.plan_id}_3` }
        ];
      }),
      redirect_url: fc.webUrl()
    });

  /**
   * Property 6: Payment Initiation API Call
   * 
   * For any pricing plan, clicking the purchase button should trigger an API call
   * to the backend containing the plan_id, amount, and billing cycle from that plan.
   * 
   * This property verifies:
   * 1. The payment service is called when a plan is selected
   * 2. The correct plan_id is passed to the payment service
   * 3. The correct amount (monthly or annual) is passed based on selected cycle
   * 4. The correct billing cycle is passed to the payment service
   * 5. The redirect URL from the pricing data is passed to the payment service
   * 
   * **Validates: Requirements 5.1**
   */
  describe('Property 6: Payment Initiation API Call', () => {
    it('should trigger API call with correct data for any plan and billing cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          fc.integer({ min: 0, max: 2 }), // Index to select one of the 3 plans
          billingCycleArbitrary(),
          async (pricingData, planIndex, billingCycle) => {
            // Setup: Store pricing data and initialize component
            parseAndStorePricingData(pricingData);
            component.ngOnInit();
            component.selectedCycle = billingCycle;

            // Mock successful payment flow
            paymentService.initiatePaymentFlow.mockResolvedValue({
              subscription_id: 'sub_test',
              amount: 999,
              subscription_plan_id: 'test_plan'
            });

            // Get the plan to test (from raw data)
            const rawPlan = pricingData.plans[planIndex];
            // Calculate expected amount from raw data
            const expectedAmount = billingCycle === 'monthly' 
              ? rawPlan.monthly_amount 
              : rawPlan.annual_amount;

            // Action: Select the plan (simulating purchase button click)
            component.onPlanSelected(rawPlan.plan_id);

            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 0));

            // Assertion: Verify payment service was called with correct data
            expect(paymentService.initiatePaymentFlow).toHaveBeenCalledTimes(1);
            expect(paymentService.initiatePaymentFlow).toHaveBeenCalledWith(
              rawPlan.plan_id,
              expectedAmount,
              billingCycle,
              pricingData.redirect_url
            );

            // Cleanup for next iteration
            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should pass monthly amount when monthly cycle is selected', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          fc.integer({ min: 0, max: 2 }),
          async (pricingData, planIndex) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();
            component.selectedCycle = 'monthly';

            paymentService.initiatePaymentFlow.mockResolvedValue({
              subscription_id: 'sub_test',
              amount: 999,
              subscription_plan_id: 'test_plan'
            });

            const rawPlan = pricingData.plans[planIndex];
            component.onPlanSelected(rawPlan.plan_id);

            await new Promise(resolve => setTimeout(resolve, 0));

            // Verify monthly amount is passed
            const callArgs = paymentService.initiatePaymentFlow.mock.calls[0];
            expect(callArgs[1]).toBe(rawPlan.monthly_amount);
            expect(callArgs[2]).toBe('monthly');

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should pass annual amount when annual cycle is selected', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          fc.integer({ min: 0, max: 2 }),
          async (pricingData, planIndex) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();
            component.selectedCycle = 'annual';

            paymentService.initiatePaymentFlow.mockResolvedValue({
              subscription_id: 'sub_test',
              amount: 999,
              subscription_plan_id: 'test_plan'
            });

            const rawPlan = pricingData.plans[planIndex];
            component.onPlanSelected(rawPlan.plan_id);

            await new Promise(resolve => setTimeout(resolve, 0));

            // Verify annual amount is passed
            const callArgs = paymentService.initiatePaymentFlow.mock.calls[0];
            expect(callArgs[1]).toBe(rawPlan.annual_amount);
            expect(callArgs[2]).toBe('annual');

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should pass correct redirect URL from pricing data', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          fc.integer({ min: 0, max: 2 }),
          billingCycleArbitrary(),
          async (pricingData, planIndex, billingCycle) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();
            component.selectedCycle = billingCycle;

            paymentService.initiatePaymentFlow.mockResolvedValue({
              subscription_id: 'sub_test',
              amount: 999,
              subscription_plan_id: 'test_plan'
            });

            const rawPlan = pricingData.plans[planIndex];
            component.onPlanSelected(rawPlan.plan_id);

            await new Promise(resolve => setTimeout(resolve, 0));

            // Verify redirect URL is passed correctly
            const callArgs = paymentService.initiatePaymentFlow.mock.calls[0];
            expect(callArgs[3]).toBe(pricingData.redirect_url);

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call payment service exactly once per plan selection', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          fc.integer({ min: 0, max: 2 }),
          billingCycleArbitrary(),
          async (pricingData, planIndex, billingCycle) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();
            component.selectedCycle = billingCycle;

            paymentService.initiatePaymentFlow.mockResolvedValue({
              subscription_id: 'sub_test',
              amount: 999,
              subscription_plan_id: 'test_plan'
            });

            const rawPlan = pricingData.plans[planIndex];
            component.onPlanSelected(rawPlan.plan_id);

            await new Promise(resolve => setTimeout(resolve, 0));

            // Verify payment service is called exactly once
            expect(paymentService.initiatePaymentFlow).toHaveBeenCalledTimes(1);

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not call payment service for invalid plan IDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          fc.string().filter(s => s.trim().length > 0),
          async (pricingData, invalidPlanId) => {
            // Ensure the invalid plan ID is not one of the valid plan IDs
            const validPlanIds = pricingData.plans.map(p => p.plan_id);
            if (validPlanIds.includes(invalidPlanId)) {
              return; // Skip this iteration
            }

            parseAndStorePricingData(pricingData);
            component.ngOnInit();

            paymentService.initiatePaymentFlow.mockResolvedValue({
              subscription_id: 'sub_test',
              amount: 999,
              subscription_plan_id: 'test_plan'
            });

            // Try to select invalid plan
            component.onPlanSelected(invalidPlanId);

            await new Promise(resolve => setTimeout(resolve, 0));

            // Verify payment service was NOT called
            expect(paymentService.initiatePaymentFlow).not.toHaveBeenCalled();
            // Verify error is set
            expect(component.error).toBeTruthy();

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve plan_id exactly as provided in pricing data', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          fc.integer({ min: 0, max: 2 }),
          billingCycleArbitrary(),
          async (pricingData, planIndex, billingCycle) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();
            component.selectedCycle = billingCycle;

            paymentService.initiatePaymentFlow.mockResolvedValue({
              subscription_id: 'sub_test',
              amount: 999,
              subscription_plan_id: 'test_plan'
            });

            const rawPlan = pricingData.plans[planIndex];
            const originalPlanId = rawPlan.plan_id;

            component.onPlanSelected(originalPlanId);

            await new Promise(resolve => setTimeout(resolve, 0));

            // Verify plan_id is passed exactly as provided (no transformation)
            const callArgs = paymentService.initiatePaymentFlow.mock.calls[0];
            expect(callArgs[0]).toBe(originalPlanId);

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all three plans in pricing data', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          billingCycleArbitrary(),
          async (pricingData, billingCycle) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();
            component.selectedCycle = billingCycle;

            paymentService.initiatePaymentFlow.mockResolvedValue({
              subscription_id: 'sub_test',
              amount: 999,
              subscription_plan_id: 'test_plan'
            });

            // Test each of the 3 plans
            for (let i = 0; i < 3; i++) {
              const rawPlan = pricingData.plans[i];
              const expectedAmount = billingCycle === 'monthly' 
                ? rawPlan.monthly_amount 
                : rawPlan.annual_amount;

              component.onPlanSelected(rawPlan.plan_id);
              await new Promise(resolve => setTimeout(resolve, 0));

              // Verify correct call for this plan
              expect(paymentService.initiatePaymentFlow).toHaveBeenLastCalledWith(
                rawPlan.plan_id,
                expectedAmount,
                billingCycle,
                pricingData.redirect_url
              );

              jest.clearAllMocks();
            }

            clearPricingData();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should set loading state when payment is initiated', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          fc.integer({ min: 0, max: 2 }),
          billingCycleArbitrary(),
          async (pricingData, planIndex, billingCycle) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();
            component.selectedCycle = billingCycle;

            // Mock payment flow that takes some time
            paymentService.initiatePaymentFlow.mockImplementation(() => 
              new Promise(resolve => setTimeout(() => resolve({
                subscription_id: 'sub_test',
                amount: 999,
                subscription_plan_id: 'test_plan'
              }), 10))
            );

            const rawPlan = pricingData.plans[planIndex];
            
            expect(component.isLoading).toBe(false);
            
            component.onPlanSelected(rawPlan.plan_id);
            
            // Loading should be true immediately after selection
            expect(component.isLoading).toBe(true);

            // Wait for completion
            await new Promise(resolve => setTimeout(resolve, 20));

            // Loading should be false after completion
            expect(component.isLoading).toBe(false);

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear previous errors when new payment is initiated', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          fc.integer({ min: 0, max: 2 }),
          billingCycleArbitrary(),
          async (pricingData, planIndex, billingCycle) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();
            component.selectedCycle = billingCycle;

            // Set a previous error
            component.error = 'Previous error message';

            paymentService.initiatePaymentFlow.mockResolvedValue({
              subscription_id: 'sub_test',
              amount: 999,
              subscription_plan_id: 'test_plan'
            });

            const rawPlan = pricingData.plans[planIndex];
            component.onPlanSelected(rawPlan.plan_id);

            await new Promise(resolve => setTimeout(resolve, 0));

            // Error should be cleared
            expect(component.error).toBe(null);

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: Contact Request Redirect
   * 
   * For any contact button click on the custom pricing card, the system should redirect
   * to the RedirectURL with a contact_request=true parameter without initiating any
   * payment API calls.
   * 
   * This property verifies:
   * 1. The redirect URL is constructed correctly with contact_request=true parameter
   * 2. No payment API calls are made when contact button is clicked
   * 3. The redirect URL preserves the original redirect URL from pricing data
   * 4. The contact_request parameter is set to 'true' (string)
   * 
   * **Validates: Requirements 9.1, 9.2, 9.3**
   */
  describe('Property 13: Contact Request Redirect', () => {
    it('should redirect to RedirectURL with contact_request=true for any pricing data', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          async (pricingData) => {
            // Setup: Store pricing data and initialize component
            parseAndStorePricingData(pricingData);
            component.ngOnInit();

            // Mock window.location.href
            let redirectedUrl = '';
            Object.defineProperty(window, 'location', {
              value: { 
                get href() { return redirectedUrl; },
                set href(url: string) { redirectedUrl = url; }
              },
              writable: true,
              configurable: true
            });

            // Action: Click contact button
            component.onContactClick();

            // Assertion: Verify redirect URL is constructed correctly
            const expectedUrl = new URL(pricingData.redirect_url);
            expectedUrl.searchParams.append('contact_request', 'true');
            expect(redirectedUrl).toBe(expectedUrl.toString());

            // Verify no payment API calls were made
            expect(paymentService.initiatePaymentFlow).not.toHaveBeenCalled();
            expect(paymentService.initiatePayment).not.toHaveBeenCalled();

            // Cleanup for next iteration
            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not initiate payment flow when contact button is clicked', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          async (pricingData) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();

            // Mock window.location.href
            Object.defineProperty(window, 'location', {
              value: { href: '' },
              writable: true,
              configurable: true
            });

            // Action: Click contact button
            component.onContactClick();

            // Wait to ensure no async operations are triggered
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assertion: Verify no payment service methods were called
            expect(paymentService.initiatePaymentFlow).not.toHaveBeenCalled();
            expect(paymentService.initiatePayment).not.toHaveBeenCalled();
            expect(paymentService.verifyPayment).not.toHaveBeenCalled();

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve original redirect URL in contact request', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          async (pricingData) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();

            let redirectedUrl = '';
            Object.defineProperty(window, 'location', {
              value: { 
                get href() { return redirectedUrl; },
                set href(url: string) { redirectedUrl = url; }
              },
              writable: true,
              configurable: true
            });

            component.onContactClick();

            // Parse the redirected URL
            const redirectUrl = new URL(redirectedUrl);
            
            // Remove the query parameter to get the base URL
            redirectUrl.searchParams.delete('contact_request');
            
            // Normalize both URLs for comparison (URL constructor normalizes)
            const normalizedRedirected = new URL(redirectUrl.toString());
            const normalizedOriginal = new URL(pricingData.redirect_url);
            
            // Compare normalized URLs
            expect(normalizedRedirected.origin).toBe(normalizedOriginal.origin);
            expect(normalizedRedirected.pathname).toBe(normalizedOriginal.pathname);

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should set contact_request parameter to string "true"', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          async (pricingData) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();

            let redirectedUrl = '';
            Object.defineProperty(window, 'location', {
              value: { 
                get href() { return redirectedUrl; },
                set href(url: string) { redirectedUrl = url; }
              },
              writable: true,
              configurable: true
            });

            component.onContactClick();

            // Parse the redirected URL
            const redirectUrl = new URL(redirectedUrl);
            
            // Verify contact_request parameter is set to 'true' (string)
            expect(redirectUrl.searchParams.get('contact_request')).toBe('true');
            expect(typeof redirectUrl.searchParams.get('contact_request')).toBe('string');

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not modify component state when contact button is clicked', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          billingCycleArbitrary(),
          async (pricingData, billingCycle) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();
            component.selectedCycle = billingCycle;

            // Mock window.location.href
            Object.defineProperty(window, 'location', {
              value: { href: '' },
              writable: true,
              configurable: true
            });

            // Capture initial state
            const initialCycle = component.selectedCycle;
            const initialLoading = component.isLoading;
            const initialError = component.error;

            // Action: Click contact button
            component.onContactClick();

            // Assertion: Verify component state is unchanged
            expect(component.selectedCycle).toBe(initialCycle);
            expect(component.isLoading).toBe(initialLoading);
            expect(component.error).toBe(initialError);

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle redirect URLs with existing query parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
          async (pricingData, paramKey, paramValue) => {
            // Add existing query parameter to redirect URL
            const urlWithParams = `${pricingData.redirect_url}?${paramKey}=${paramValue}`;
            const modifiedData = {
              ...pricingData,
              redirect_url: urlWithParams
            };

            parseAndStorePricingData(modifiedData);
            component.ngOnInit();

            let redirectedUrl = '';
            Object.defineProperty(window, 'location', {
              value: { 
                get href() { return redirectedUrl; },
                set href(url: string) { redirectedUrl = url; }
              },
              writable: true,
              configurable: true
            });

            component.onContactClick();

            // Parse the redirected URL
            const redirectUrl = new URL(redirectedUrl);
            
            // Verify both the existing parameter and contact_request are present
            expect(redirectUrl.searchParams.get(paramKey)).toBe(paramValue);
            expect(redirectUrl.searchParams.get('contact_request')).toBe('true');

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should work regardless of selected billing cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          billingCycleArbitrary(),
          async (pricingData, billingCycle) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();
            component.selectedCycle = billingCycle;

            let redirectedUrl = '';
            Object.defineProperty(window, 'location', {
              value: { 
                get href() { return redirectedUrl; },
                set href(url: string) { redirectedUrl = url; }
              },
              writable: true,
              configurable: true
            });

            component.onContactClick();

            // Verify redirect URL is constructed correctly regardless of billing cycle
            const expectedUrl = new URL(pricingData.redirect_url);
            expectedUrl.searchParams.append('contact_request', 'true');
            expect(redirectedUrl).toBe(expectedUrl.toString());

            // Verify no payment calls
            expect(paymentService.initiatePaymentFlow).not.toHaveBeenCalled();

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not set loading state when contact button is clicked', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPricingDataArbitrary(),
          async (pricingData) => {
            parseAndStorePricingData(pricingData);
            component.ngOnInit();

            // Mock window.location.href
            Object.defineProperty(window, 'location', {
              value: { href: '' },
              writable: true,
              configurable: true
            });

            // Verify initial loading state
            expect(component.isLoading).toBe(false);

            // Action: Click contact button
            component.onContactClick();

            // Verify loading state remains false
            expect(component.isLoading).toBe(false);

            // Wait to ensure no async state changes
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(component.isLoading).toBe(false);

            clearPricingData();
            jest.clearAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
