/**
 * Pricing data models for the Vibgyor Payment Gateway
 * These interfaces define the structure of pricing plans and related data
 */

/**
 * Complete pricing data received from external site
 */
export interface PricingData {
  plans: PricingPlan[];
  addons?: AddonPackage[];
  redirectUrl: string;
  paymentProvider?: 'razorpay' | 'pinelabs';
}

/**
 * Individual pricing plan with monthly and annual pricing
 */
export interface PricingPlan {
  plan_id: string;
  name: string;
  monthlyAmount: number;
  annualAmount: number;
  features: string[];
}

/**
 * Add-on package that can be purchased with a plan
 */
export interface AddonPackage {
  addon_id: string;
  name: string;
  description: string;
  monthlyAmount: number;
  annualAmount: number;
}

/**
 * Custom plan information for enterprise/custom pricing
 */
export interface CustomPlan {
  name: string;
  description: string;
}

/**
 * Onboarding step in the multi-step flow
 */
export type OnboardingStep = 'plan-selection' | 'addon-selection' | 'checkout';

/**
 * Selected plan and addons for checkout
 */
export interface CheckoutSelection {
  plan: PricingPlan;
  billingCycle: 'monthly' | 'annual';
  addons: AddonPackage[];
}
