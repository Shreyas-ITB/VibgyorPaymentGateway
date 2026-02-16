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

describe('PricingPageComponent', () => {
  let component: PricingPageComponent;
  let fixture: ComponentFixture<PricingPageComponent>;
  let paymentService: jest.Mocked<PaymentService>;

  const validPricingData = {
    plans: [
      {
        plan_id: 'basic',
        name: 'Basic',
        monthly_amount: 999,
        annual_amount: 9990,
        features: ['Feature 1', 'Feature 2']
      },
      {
        plan_id: 'pro',
        name: 'Pro',
        monthly_amount: 2999,
        annual_amount: 29990,
        features: ['All Basic features', 'Feature 3']
      },
      {
        plan_id: 'enterprise',
        name: 'Enterprise',
        monthly_amount: 5999,
        annual_amount: 59990,
        features: ['All Pro features', 'Feature 4']
      }
    ],
    redirect_url: 'https://example.com/callback'
  };

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
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.selectedCycle).toBe('monthly');
      expect(component.isLoading).toBe(false);
      expect(component.error).toBe(null);
    });

    it('should load pricing data from session storage on init', () => {
      parseAndStorePricingData(validPricingData);
      
      component.ngOnInit();
      
      expect(component.pricingData).toBeTruthy();
      expect(component.pricingData?.plans.length).toBe(3);
      expect(component.error).toBe(null);
    });
  });

  describe('Error Handling - Invalid JSON', () => {
    it('should display error message for invalid JSON', () => {
      const invalidData = {
        plans: [
          { plan_id: 'basic', name: 'Basic', monthly_amount: 999, annual_amount: 9990, features: ['Feature 1'] }
        ],
        redirect_url: 'https://example.com'
      };
      
      const result = parseAndStorePricingData(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('exactly 3 plans required');
    });

    it('should display error message for missing redirect_url', () => {
      const invalidData = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthly_amount: 999,
            annual_amount: 9990,
            features: ['Feature 1']
          },
          {
            plan_id: 'pro',
            name: 'Pro',
            monthly_amount: 2999,
            annual_amount: 29990,
            features: ['Feature 2']
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthly_amount: 5999,
            annual_amount: 59990,
            features: ['Feature 3']
          }
        ]
      };
      
      const result = parseAndStorePricingData(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('redirect_url');
    });

    it('should display error message for missing plan fields', () => {
      const invalidData = {
        plans: [
          { plan_id: 'basic', name: 'Basic', monthly_amount: 999 },
          { plan_id: 'pro', name: 'Pro', monthly_amount: 2999 },
          { plan_id: 'enterprise', name: 'Enterprise', monthly_amount: 5999 }
        ],
        redirect_url: 'https://example.com'
      };
      
      const result = parseAndStorePricingData(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('annual_amount');
    });
  });

  describe('Billing Cycle Toggle', () => {
    beforeEach(() => {
      parseAndStorePricingData(validPricingData);
      component.ngOnInit();
    });

    it('should update selected cycle when toggle is changed', () => {
      expect(component.selectedCycle).toBe('monthly');
      
      component.onBillingCycleChanged('annual');
      
      expect(component.selectedCycle).toBe('annual');
    });

    it('should maintain pricing data when cycle is changed', () => {
      const originalPlans = component.pricingData?.plans;
      
      component.onBillingCycleChanged('annual');
      
      expect(component.pricingData?.plans).toEqual(originalPlans);
    });
  });

  describe('Plan Selection', () => {
    beforeEach(() => {
      parseAndStorePricingData(validPricingData);
      component.ngOnInit();
      paymentService.initiatePaymentFlow.mockResolvedValue({
        subscription_id: 'sub_123',
        amount: 999,
        subscription_plan_id: 'basic'
      });
    });

    it('should initiate payment with correct monthly amount', async () => {
      component.selectedCycle = 'monthly';
      
      component.onPlanSelected('basic');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(paymentService.initiatePaymentFlow).toHaveBeenCalledWith(
        'basic',
        999,
        'monthly',
        'https://example.com/callback'
      );
    });

    it('should initiate payment with correct annual amount', async () => {
      component.selectedCycle = 'annual';
      
      component.onPlanSelected('basic');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(paymentService.initiatePaymentFlow).toHaveBeenCalledWith(
        'basic',
        9990,
        'annual',
        'https://example.com/callback'
      );
    });

    it('should set loading state during payment initiation', async () => {
      component.onPlanSelected('basic');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(component.isLoading).toBe(false); // Completes after promise resolves
    });

    it('should handle payment initiation error', async () => {
      paymentService.initiatePaymentFlow.mockRejectedValue(
        new Error('Payment initiation failed')
      );
      
      component.onPlanSelected('basic');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(component.error).toBeTruthy();
      expect(component.isLoading).toBe(false);
    });

    it('should display error for invalid plan selection', () => {
      component.onPlanSelected('invalid_plan');
      
      expect(component.error).toBe('Selected plan not found');
    });
  });

  describe('Contact Button', () => {
    beforeEach(() => {
      parseAndStorePricingData(validPricingData);
      component.ngOnInit();
    });

    it('should redirect to external site with contact_request parameter', () => {
      // Mock window.location.href
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true
      });
      
      component.onContactClick();
      
      const expectedUrl = 'https://example.com/callback?contact_request=true';
      expect(window.location.href).toBe(expectedUrl);
    });

    it('should not initiate payment flow for contact button', () => {
      // Mock window.location.href
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true
      });
      
      component.onContactClick();
      
      expect(paymentService.initiatePaymentFlow).not.toHaveBeenCalled();
    });
  });

  describe('Error Display - Payment Failures', () => {
    beforeEach(() => {
      parseAndStorePricingData(validPricingData);
      component.ngOnInit();
    });

    it('should display error message when payment initiation fails', async () => {
      paymentService.initiatePaymentFlow.mockRejectedValue(
        new Error('Network error')
      );
      
      component.onPlanSelected('basic');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(component.error).toBeTruthy();
      expect(component.error).toContain('Network error');
    });

    it('should clear previous errors when new payment is initiated', async () => {
      component.error = 'Previous error';
      paymentService.initiatePaymentFlow.mockResolvedValue({
        subscription_id: 'sub_123',
        amount: 999,
        subscription_plan_id: 'basic'
      });
      
      component.onPlanSelected('basic');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(component.error).toBe(null);
    });
  });

  /**
   * Task 11.2: Write unit tests for error display
   * Validates: Requirements 1.4, 8.2
   */
  describe('Error Display in UI', () => {
    it('should display error message in UI when invalid JSON is provided', () => {
      // Mock URL with invalid JSON data
      const invalidData = {
        plans: [
          { plan_id: 'basic', name: 'Basic', monthly_amount: 999, annual_amount: 9990, features: ['Feature 1'] }
        ],
        redirect_url: 'https://example.com'
      };
      
      // Mock window.location.search to simulate data coming from URL
      Object.defineProperty(window, 'location', {
        value: {
          search: `?data=${encodeURIComponent(JSON.stringify(invalidData))}`
        },
        writable: true,
        configurable: true
      });
      
      component.ngOnInit();
      fixture.detectChanges();
      
      // Verify error is set in component
      expect(component.error).toBeTruthy();
      expect(component.error).toContain('exactly 3 plans required');
      
      // Verify error is displayed in the DOM
      const compiled = fixture.nativeElement;
      const errorElement = compiled.querySelector('[role="alert"]');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Error');
      expect(errorElement.textContent).toContain('exactly 3 plans required');
    });

    it('should display error message in UI when payment fails', async () => {
      // Set up valid pricing data first
      parseAndStorePricingData(validPricingData);
      component.ngOnInit();
      
      // Mock payment failure
      paymentService.initiatePaymentFlow.mockRejectedValue(
        new Error('Payment gateway unavailable')
      );
      
      // Trigger payment
      component.onPlanSelected('basic');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      fixture.detectChanges();
      
      // Verify error is set in component
      expect(component.error).toBeTruthy();
      expect(component.error).toContain('Payment gateway unavailable');
      
      // Verify error is displayed in the DOM
      const compiled = fixture.nativeElement;
      const errorElement = compiled.querySelector('[role="alert"]');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Error');
      expect(errorElement.textContent).toContain('Payment gateway unavailable');
    });

    it('should hide pricing cards when error is displayed', async () => {
      parseAndStorePricingData(validPricingData);
      component.ngOnInit();
      
      // Mock payment failure
      paymentService.initiatePaymentFlow.mockRejectedValue(
        new Error('Service unavailable')
      );
      
      component.onPlanSelected('basic');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      fixture.detectChanges();
      
      // Verify error is displayed
      const compiled = fixture.nativeElement;
      const errorElement = compiled.querySelector('[role="alert"]');
      expect(errorElement).toBeTruthy();
      
      // Verify pricing cards are hidden (grid should not be visible)
      const pricingGrid = compiled.querySelector('.grid');
      expect(pricingGrid).toBeFalsy();
    });

    it('should display error with proper styling (red background)', async () => {
      parseAndStorePricingData(validPricingData);
      component.ngOnInit();
      
      paymentService.initiatePaymentFlow.mockRejectedValue(
        new Error('Connection timeout')
      );
      
      component.onPlanSelected('basic');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const errorElement = compiled.querySelector('[role="alert"]');
      
      expect(errorElement).toBeTruthy();
      // Check for red styling classes
      expect(errorElement.className).toContain('bg-red-100');
      expect(errorElement.className).toContain('border-red-400');
      expect(errorElement.className).toContain('text-red-700');
    });

    it('should display generic error message when payment initiation fails without specific error', async () => {
      parseAndStorePricingData(validPricingData);
      component.ngOnInit();
      
      // Mock payment failure without error message
      paymentService.initiatePaymentFlow.mockRejectedValue({});
      
      component.onPlanSelected('basic');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      fixture.detectChanges();
      
      expect(component.error).toBeTruthy();
      expect(component.error).toContain('Payment failed');
      
      const compiled = fixture.nativeElement;
      const errorElement = compiled.querySelector('[role="alert"]');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Payment failed');
    });

    it('should display error when JSON is missing redirect_url', () => {
      const invalidData = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthly_amount: 999,
            annual_amount: 9990,
            features: ['Feature 1']
          },
          {
            plan_id: 'pro',
            name: 'Pro',
            monthly_amount: 2999,
            annual_amount: 29990,
            features: ['Feature 2']
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthly_amount: 5999,
            annual_amount: 59990,
            features: ['Feature 3']
          }
        ]
      };
      
      // Mock window.location.search to simulate data coming from URL
      Object.defineProperty(window, 'location', {
        value: {
          search: `?data=${encodeURIComponent(JSON.stringify(invalidData))}`
        },
        writable: true,
        configurable: true
      });
      
      component.ngOnInit();
      fixture.detectChanges();
      
      expect(component.error).toBeTruthy();
      expect(component.error).toContain('redirect_url');
      
      const compiled = fixture.nativeElement;
      const errorElement = compiled.querySelector('[role="alert"]');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('redirect_url');
    });

    it('should not display pricing cards or billing toggle when invalid JSON error is shown', () => {
      const invalidData = {
        plans: [],
        redirect_url: 'https://example.com'
      };
      
      parseAndStorePricingData(invalidData);
      component.ngOnInit();
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      
      // Error should be displayed
      const errorElement = compiled.querySelector('[role="alert"]');
      expect(errorElement).toBeTruthy();
      
      // Billing toggle should not be displayed
      const billingToggle = compiled.querySelector('app-billing-cycle-toggle');
      expect(billingToggle).toBeFalsy();
      
      // Pricing cards should not be displayed
      const pricingCards = compiled.querySelectorAll('app-pricing-card');
      expect(pricingCards.length).toBe(0);
    });
  });

  describe('Responsive Grid Display', () => {
    beforeEach(() => {
      parseAndStorePricingData(validPricingData);
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should display 3 standard pricing cards', () => {
      const compiled = fixture.nativeElement;
      const pricingCards = compiled.querySelectorAll('app-pricing-card');
      
      // 3 standard plans + 1 custom plan = 4 total
      expect(pricingCards.length).toBe(4);
    });

    it('should display custom pricing card', () => {
      const compiled = fixture.nativeElement;
      const pricingCards = compiled.querySelectorAll('app-pricing-card');
      
      // Last card should be custom
      expect(pricingCards.length).toBe(4);
    });
  });
});
