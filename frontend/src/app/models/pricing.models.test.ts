/**
 * Unit tests for pricing data models
 */

import { PricingData, PricingPlan, CustomPlan } from './pricing.models';

describe('Pricing Models', () => {
  describe('PricingPlan', () => {
    it('should accept valid pricing plan structure', () => {
      const plan: PricingPlan = {
        plan_id: 'basic',
        name: 'Basic Plan',
        monthlyAmount: 999,
        annualAmount: 9990,
        features: ['Feature 1', 'Feature 2']
      };

      expect(plan.plan_id).toBe('basic');
      expect(plan.name).toBe('Basic Plan');
      expect(plan.monthlyAmount).toBe(999);
      expect(plan.annualAmount).toBe(9990);
      expect(plan.features).toHaveLength(2);
    });

    it('should handle empty features array', () => {
      const plan: PricingPlan = {
        plan_id: 'test',
        name: 'Test Plan',
        monthlyAmount: 0,
        annualAmount: 0,
        features: []
      };

      expect(plan.features).toEqual([]);
    });
  });

  describe('PricingData', () => {
    it('should accept valid pricing data with 3 plans', () => {
      const data: PricingData = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthlyAmount: 999,
            annualAmount: 9990,
            features: ['Feature 1']
          },
          {
            plan_id: 'pro',
            name: 'Pro',
            monthlyAmount: 1999,
            annualAmount: 19990,
            features: ['Feature 1', 'Feature 2']
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthlyAmount: 4999,
            annualAmount: 49990,
            features: ['All features']
          }
        ],
        redirectUrl: 'https://example.com/callback'
      };

      expect(data.plans).toHaveLength(3);
      expect(data.redirectUrl).toBe('https://example.com/callback');
    });
  });

  describe('CustomPlan', () => {
    it('should accept valid custom plan structure', () => {
      const customPlan: CustomPlan = {
        name: 'Enterprise Custom',
        description: 'Contact us for custom pricing'
      };

      expect(customPlan.name).toBe('Enterprise Custom');
      expect(customPlan.description).toBe('Contact us for custom pricing');
    });
  });
});
