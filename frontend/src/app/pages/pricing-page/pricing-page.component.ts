import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PricingCardComponent } from '../../components/pricing-card/pricing-card.component';
import { BillingCycleToggleComponent } from '../../components/billing-cycle-toggle/billing-cycle-toggle.component';
import { AddonCardComponent } from '../../components/addon-card/addon-card.component';
import { ToastComponent } from '../../components/toast/toast.component';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { parseAndStorePricingData, getStoredPricingData } from '../../services/pricing-data-parser.service';
import { PricingData, PricingPlan, CustomPlan, OnboardingStep, AddonPackage } from '../../models/pricing.models';

/**
 * PricingPageComponent - Main container component for pricing display
 * Orchestrates multi-step onboarding: plan selection → addon selection → checkout
 */
@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [CommonModule, PricingCardComponent, BillingCycleToggleComponent, AddonCardComponent, ToastComponent],
  templateUrl: './pricing-page.component.html',
  styleUrls: ['./pricing-page.component.css']
})
export class PricingPageComponent implements OnInit {
  pricingData: PricingData | null = null;
  selectedCycle: 'monthly' | 'annual' = 'monthly';
  isLoading: boolean = false;
  error: string | null = null;
  isDarkMode: boolean = true;
  
  // Multi-step onboarding state
  currentStep: OnboardingStep = 'plan-selection';
  selectedPlan: PricingPlan | null = null;
  selectedAddonIds: Set<string> = new Set();
  
  customPlan: CustomPlan = {
    name: 'Custom',
    description: 'Contact us for custom pricing tailored to your needs'
  };

  constructor(
    private paymentService: PaymentService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadPricingData();
    this.initializeTheme();
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      this.isDarkMode = false;
      document.documentElement.classList.remove('dark');
    } else {
      this.isDarkMode = true;
      document.documentElement.classList.add('dark');
    }
  }

  /**
   * Toggle between dark and light mode
   */
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  /**
   * Load and parse pricing data from URL or session storage
   */
  private loadPricingData(): void {
    try {
      // First, try to get data from session storage
      let data = getStoredPricingData();
      
      // If not in session storage, try to parse from URL or request body
      if (!data) {
        const jsonData = this.extractPricingDataFromRequest();
        if (jsonData) {
          const result = parseAndStorePricingData(jsonData);
          if (result.success && result.data) {
            data = result.data;
            this.toastService.showSuccess('Pricing data loaded successfully');
          } else {
            this.error = result.error?.message || 'Unable to load pricing information. Please contact support.';
            this.toastService.showError(this.error);
            return;
          }
        } else {
          this.error = 'No pricing data provided. Please contact support.';
          this.toastService.showError(this.error);
          return;
        }
      }
      
      this.pricingData = data;
    } catch (err) {
      this.error = 'Unable to load pricing information. Please contact support.';
      this.toastService.showError(this.error);
      console.error('Error loading pricing data:', err);
    }
  }

  /**
   * Extract pricing data from URL query parameters or request body
   * Supports both URL-encoded JSON and base64 encoded data
   */
  private extractPricingDataFromRequest(): any {
    // Try to get from URL query parameter (for testing/demo purposes)
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    
    if (dataParam) {
      try {
        // First try to decode as URL-encoded JSON
        return JSON.parse(decodeURIComponent(dataParam));
      } catch (e) {
        // If that fails, the parsePricingData function will handle base64 decoding
        return dataParam;
      }
    }
    
    // For development: Return mock data if no data is provided
    if (!dataParam && window.location.hostname === 'localhost') {
      console.log('Using mock pricing data for development');
      return {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthlyAmount: 999,
            annualAmount: 9990,
            features: [
              'Up to 10 users',
              'Basic support',
              '10GB storage',
              'Email support'
            ]
          },
          {
            plan_id: 'pro',
            name: 'Professional',
            monthlyAmount: 2999,
            annualAmount: 29990,
            features: [
              'Up to 50 users',
              'Priority support',
              '100GB storage',
              'Phone & email support',
              'Advanced analytics'
            ]
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthlyAmount: 9999,
            annualAmount: 99990,
            features: [
              'Unlimited users',
              '24/7 dedicated support',
              'Unlimited storage',
              'Custom integrations',
              'Advanced security',
              'SLA guarantee'
            ]
          }
        ],
        redirectUrl: 'http://localhost:3000/success',
        paymentProvider: 'razorpay'
      };
    }
    
    // In production, this would handle POST request body data
    // For now, return null to indicate no data found
    return null;
  }

  /**
   * Handle billing cycle toggle event
   */
  onBillingCycleChanged(cycle: 'monthly' | 'annual'): void {
    this.selectedCycle = cycle;
  }

  /**
   * Handle plan selection and move to addon selection
   */
  onPlanSelected(planId: string): void {
    if (!this.pricingData || this.isLoading) {
      return;
    }

    const plan = this.pricingData.plans.find(p => p.plan_id === planId);
    if (!plan) {
      this.error = 'Selected plan not found';
      return;
    }

    this.selectedPlan = plan;
    
    // If there are addons, go to addon selection, otherwise go to checkout
    if (this.pricingData.addons && this.pricingData.addons.length > 0) {
      this.currentStep = 'addon-selection';
    } else {
      this.currentStep = 'checkout';
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Handle addon toggle
   */
  onAddonToggled(addonId: string): void {
    if (this.selectedAddonIds.has(addonId)) {
      this.selectedAddonIds.delete(addonId);
    } else {
      this.selectedAddonIds.add(addonId);
    }
  }

  /**
   * Check if addon is selected
   */
  isAddonSelected(addonId: string): boolean {
    return this.selectedAddonIds.has(addonId);
  }

  /**
   * Get selected addons
   */
  get selectedAddons(): AddonPackage[] {
    if (!this.pricingData?.addons) return [];
    return this.pricingData.addons.filter(addon => 
      this.selectedAddonIds.has(addon.addon_id)
    );
  }

  /**
   * Continue to checkout from addon selection
   */
  continueToCheckout(): void {
    this.currentStep = 'checkout';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Skip addon selection and go to checkout
   */
  skipAddons(): void {
    this.selectedAddonIds.clear();
    this.currentStep = 'checkout';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Go back to previous step
   */
  goBack(): void {
    if (this.currentStep === 'checkout') {
      if (this.pricingData?.addons && this.pricingData.addons.length > 0) {
        this.currentStep = 'addon-selection';
      } else {
        this.currentStep = 'plan-selection';
        this.selectedPlan = null;
      }
    } else if (this.currentStep === 'addon-selection') {
      this.currentStep = 'plan-selection';
      this.selectedPlan = null;
      this.selectedAddonIds.clear();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Calculate total amount including addons
   */
  getTotalAmount(): number {
    if (!this.selectedPlan) return 0;
    
    const planAmount = this.selectedCycle === 'monthly' 
      ? this.selectedPlan.monthlyAmount 
      : this.selectedPlan.annualAmount;
    
    const addonsAmount = this.selectedAddons.reduce((total, addon) => {
      const amount = this.selectedCycle === 'monthly' 
        ? addon.monthlyAmount 
        : addon.annualAmount;
      return total + amount;
    }, 0);
    
    return planAmount + addonsAmount;
  }

  /**
   * Initiate payment flow with selected plan and addons
   */
  proceedToPayment(): void {
    if (!this.pricingData || !this.selectedPlan) {
      return;
    }

    const amount = this.getTotalAmount();
    const addonIds = Array.from(this.selectedAddonIds);

    this.isLoading = true;
    this.error = null;

    // Use the payment service with addon IDs
    this.paymentService.initiatePaymentFlow(
      this.selectedPlan.plan_id, 
      amount, 
      this.selectedCycle,
      this.pricingData.redirectUrl,
      addonIds.length > 0 ? addonIds : undefined
    )
      .then((subscriptionData) => {
        this.isLoading = false;
        this.toastService.showSuccess('Payment successful! Redirecting...');
        console.log('Payment successful:', subscriptionData);
      })
      .catch((err) => {
        this.isLoading = false;
        const errorMessage = err.message || 'Payment failed. Please try again.';
        this.error = errorMessage;
        this.toastService.showError(errorMessage);
        console.error('Payment error:', err);
      });
  }

  /**
   * Handle contact button click for custom pricing
   */
  onContactClick(): void {
    if (!this.pricingData) {
      return;
    }

    // Redirect to external site with contact_request parameter
    const url = new URL(this.pricingData.redirectUrl);
    url.searchParams.append('contact_request', 'true');
    window.location.href = url.toString();
  }

  /**
   * Get all plans including custom plan for display
   */
  get allPlans(): PricingPlan[] {
    return this.pricingData?.plans || [];
  }
}
