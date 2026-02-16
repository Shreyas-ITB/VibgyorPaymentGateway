/**
 * Pricing data models for the Vibgyor Payment Gateway
 * These interfaces define the structure of pricing plans and related data
 */

/**
 * Complete pricing data received from external site
 */
export interface PricingData {
  plans: PricingPlan[];
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
 * Custom plan information for enterprise/custom pricing
 */
export interface CustomPlan {
  name: string;
  description: string;
}
