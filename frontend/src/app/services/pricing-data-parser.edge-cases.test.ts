/**
 * Edge case tests for pricing data parser
 * Tests empty JSON, wrong number of plans, missing redirect URL, and other edge cases
 */

import {
  parsePricingData,
  parseAndStorePricingData,
  getStoredPricingData
} from './pricing-data-parser.service';
import { ErrorCode } from '../models/api.models';

describe('PricingDataParser - Edge Cases', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('Empty JSON input', () => {
    it('should reject empty object', () => {
      const emptyJSON = {};

      const result = parsePricingData(emptyJSON);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe(ErrorCode.INVALID_JSON);
      expect(result.error!.message).toContain('redirect_url');
    });

    it('should reject empty string', () => {
      const emptyString = '';

      const result = parsePricingData(emptyString);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty array', () => {
      const emptyArray: any[] = [];

      const result = parsePricingData(emptyArray);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject null', () => {
      const result = parsePricingData(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('Invalid JSON');
    });

    it('should reject undefined', () => {
      const result = parsePricingData(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('Invalid JSON');
    });
  });

  describe('JSON with wrong number of plans', () => {
    it('should reject JSON with 0 plans', () => {
      const invalidJSON = {
        plans: [],
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe(ErrorCode.INVALID_JSON);
      expect(result.error!.message).toContain('exactly 3 plans required');
      expect(result.error!.message).toContain('got 0');
    });

    it('should reject JSON with 1 plan', () => {
      const invalidJSON = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthly_amount: 999,
            annual_amount: 9990,
            features: ['Feature 1']
          }
        ],
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('exactly 3 plans required');
      expect(result.error!.message).toContain('got 1');
    });

    it('should reject JSON with 2 plans', () => {
      const invalidJSON = {
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
            monthly_amount: 1999,
            annual_amount: 19990,
            features: ['Feature 2']
          }
        ],
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('exactly 3 plans required');
      expect(result.error!.message).toContain('got 2');
    });

    it('should reject JSON with 4 plans', () => {
      const invalidJSON = {
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
            monthly_amount: 1999,
            annual_amount: 19990,
            features: ['Feature 2']
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthly_amount: 2999,
            annual_amount: 29990,
            features: ['Feature 3']
          },
          {
            plan_id: 'extra',
            name: 'Extra',
            monthly_amount: 3999,
            annual_amount: 39990,
            features: ['Feature 4']
          }
        ],
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('exactly 3 plans required');
      expect(result.error!.message).toContain('got 4');
    });

    it('should reject JSON with 10 plans', () => {
      const plans = Array.from({ length: 10 }, (_, i) => ({
        plan_id: `plan_${i}`,
        name: `Plan ${i}`,
        monthly_amount: 999 + i * 100,
        annual_amount: 9990 + i * 1000,
        features: [`Feature ${i}`]
      }));

      const invalidJSON = {
        plans,
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('exactly 3 plans required');
      expect(result.error!.message).toContain('got 10');
    });
  });

  describe('Missing redirect URL', () => {
    it('should reject JSON with missing redirect_url field', () => {
      const invalidJSON = {
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
            monthly_amount: 1999,
            annual_amount: 19990,
            features: ['Feature 2']
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthly_amount: 2999,
            annual_amount: 29990,
            features: ['Feature 3']
          }
        ]
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe(ErrorCode.INVALID_JSON);
      expect(result.error!.message).toContain('redirect_url');
    });

    it('should reject JSON with null redirect_url', () => {
      const invalidJSON = {
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
            monthly_amount: 1999,
            annual_amount: 19990,
            features: ['Feature 2']
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthly_amount: 2999,
            annual_amount: 29990,
            features: ['Feature 3']
          }
        ],
        redirect_url: null
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('redirect_url');
    });

    it('should reject JSON with empty string redirect_url', () => {
      const invalidJSON = {
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
            monthly_amount: 1999,
            annual_amount: 19990,
            features: ['Feature 2']
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthly_amount: 2999,
            annual_amount: 29990,
            features: ['Feature 3']
          }
        ],
        redirect_url: ''
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('redirect_url');
    });

    it('should reject JSON with non-string redirect_url', () => {
      const invalidJSON = {
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
            monthly_amount: 1999,
            annual_amount: 19990,
            features: ['Feature 2']
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthly_amount: 2999,
            annual_amount: 29990,
            features: ['Feature 3']
          }
        ],
        redirect_url: 12345
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('redirect_url');
    });
  });

  describe('Additional edge cases', () => {
    it('should not store data when parsing fails', () => {
      const invalidJSON = {
        plans: [],
        redirect_url: 'https://example.com/callback'
      };

      const result = parseAndStorePricingData(invalidJSON);

      expect(result.success).toBe(false);
      
      const stored = getStoredPricingData();
      expect(stored).toBeNull();
    });

    it('should handle malformed JSON string gracefully', () => {
      const malformedJSON = '{ "plans": [1, 2, 3], "redirect_url": }';

      const result = parsePricingData(malformedJSON);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject JSON with plans as non-array', () => {
      const invalidJSON = {
        plans: 'not an array',
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('plans must be an array');
    });

    it('should reject JSON with plans as object', () => {
      const invalidJSON = {
        plans: { plan1: 'data' },
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('plans must be an array');
    });

    it('should reject JSON with plans as number', () => {
      const invalidJSON = {
        plans: 3,
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('plans must be an array');
    });
  });
});
