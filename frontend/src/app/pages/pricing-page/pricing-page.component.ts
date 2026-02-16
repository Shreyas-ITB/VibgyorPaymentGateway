import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PricingCardComponent } from '../../components/pricing-card/pricing-card.component';
import { BillingCycleToggleComponent } from '../../components/billing-cycle-toggle/billing-cycle-toggle.component';
import { ToastComponent } from '../../components/toast/toast.component';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { parseAndStorePricingData, getStoredPricingData } from '../../services/pricing-data-parser.service';
import { PricingData, PricingPlan, CustomPlan } from '../../models/pricing.models';

/**
 * PricingPageComponent - Main container component for pricing display
 * Orchestrates pricing plan display, billing cycle toggling, and payment flow
 */
@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [CommonModule, PricingCardComponent, BillingCycleToggleComponent, ToastComponent],
  templateUrl: './pricing-page.component.html',
  styleUrls: ['./pricing-page.component.css']
})
export class PricingPageComponent implements OnInit {
  pricingData: PricingData | null = null;
  selectedCycle: 'monthly' | 'annual' = 'monthly';
  isLoading: boolean = false;
  error: string | null = null;
  isDarkMode: boolean = true;
  
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
   * Handle plan selection and initiate payment
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

    const amount = this.selectedCycle === 'monthly' 
      ? plan.monthlyAmount 
      : plan.annualAmount;

    this.initiatePayment(planId, amount);
  }

  /**
   * Initiate payment flow
   */
  private initiatePayment(planId: string, amount: number): void {
    if (!this.pricingData) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    // Use the new integrated payment flow
    this.paymentService.initiatePaymentFlow(
      planId, 
      amount, 
      this.selectedCycle,
      this.pricingData.redirectUrl
    )
      .then((subscriptionData) => {
        // Payment successful - user will be redirected
        this.isLoading = false;
        this.toastService.showSuccess('Payment successful! Redirecting...');
        console.log('Payment successful:', subscriptionData);
      })
      .catch((err) => {
        // Payment failed - user will be redirected with error
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
