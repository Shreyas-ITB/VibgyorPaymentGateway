/**
 * Unit tests for pricing data parser service
 */

import {
  parsePricingData,
  storePricingData,
  getStoredPricingData,
  clearPricingData,
  parseAndStorePricingData
} from './pricing-data-parser.service';
import { PricingData } from '../models/pricing.models';
import { ErrorCode } from '../models/api.models';

describe('PricingDataParser', () => {
  // Clear session storage before and after each test
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('parsePricingData', () => {
    it('should parse valid JSON with 3 plans', () => {
      const validJSON = {
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
            name: 'Professional',
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

      const result = parsePricingData(validJSON);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.plans).toHaveLength(3);
      expect(result.data!.redirectUrl).toBe('https://example.com/callback');
      expect(result.data!.plans[0].plan_id).toBe('basic');
      expect(result.data!.plans[0].monthlyAmount).toBe(999);
      expect(result.data!.plans[0].annualAmount).toBe(9990);
    });

    it('should parse valid JSON string', () => {
      const validJSONString = JSON.stringify({
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
        redirect_url: 'https://example.com/callback'
      });

      const result = parsePricingData(validJSONString);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject JSON with less than 3 plans', () => {
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
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe(ErrorCode.INVALID_JSON);
      expect(result.error!.message).toContain('exactly 3 plans required');
    });

    it('should reject JSON with more than 3 plans', () => {
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
    });

    it('should reject JSON missing redirect_url', () => {
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
      expect(result.error!.message).toContain('redirect_url');
    });

    it('should reject JSON with plan missing plan_id', () => {
      const invalidJSON = {
        plans: [
          {
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
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('plan_id');
    });

    it('should reject JSON with plan missing name', () => {
      const invalidJSON = {
        plans: [
          {
            plan_id: 'basic',
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
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('name');
    });

    it('should reject JSON with plan missing monthly_amount', () => {
      const invalidJSON = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
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
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('monthly_amount');
    });

    it('should reject JSON with plan missing annual_amount', () => {
      const invalidJSON = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthly_amount: 999,
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
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('annual_amount');
    });

    it('should reject JSON with plan missing features', () => {
      const invalidJSON = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthly_amount: 999,
            annual_amount: 9990
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
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('features');
    });

    it('should reject JSON with empty features array', () => {
      const invalidJSON = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthly_amount: 999,
            annual_amount: 9990,
            features: []
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
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('features array cannot be empty');
    });

    it('should reject JSON with non-string feature', () => {
      const invalidJSON = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthly_amount: 999,
            annual_amount: 9990,
            features: ['Feature 1', 123]
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
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('feature');
      expect(result.error!.message).toContain('must be a string');
    });

    it('should reject malformed JSON string', () => {
      const malformedJSON = '{ invalid json }';

      const result = parsePricingData(malformedJSON);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject null input', () => {
      const result = parsePricingData(null);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('Invalid JSON');
    });

    it('should reject undefined input', () => {
      const result = parsePricingData(undefined);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('Invalid JSON');
    });

    it('should reject non-array plans', () => {
      const invalidJSON = {
        plans: 'not an array',
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('plans must be an array');
    });

    it('should reject negative monthly_amount', () => {
      const invalidJSON = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthly_amount: -999,
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
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('monthly_amount');
    });

    it('should reject zero annual_amount', () => {
      const invalidJSON = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthly_amount: 999,
            annual_amount: 0,
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
        redirect_url: 'https://example.com/callback'
      };

      const result = parsePricingData(invalidJSON);

      expect(result.success).toBe(false);
      expect(result.error!.message).toContain('annual_amount');
    });

    it('should parse valid base64 encoded JSON', () => {
      const validJSON = {
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
            name: 'Professional',
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

      const jsonString = JSON.stringify(validJSON);
      const base64String = btoa(jsonString);
      const result = parsePricingData(base64String);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.plans).toHaveLength(3);
      expect(result.data!.redirectUrl).toBe('https://example.com/callback');
      expect(result.data!.plans[0].plan_id).toBe('basic');
    });

    it('should parse base64 encoded JSON with whitespace', () => {
      const validJSON = {
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
        redirect_url: 'https://example.com/callback'
      };

      const jsonString = JSON.stringify(validJSON);
      const base64String = '  ' + btoa(jsonString) + '  ';
      const result = parsePricingData(base64String);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should parse payment_provider field when present', () => {
      const validJSON = {
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
        redirect_url: 'https://example.com/callback',
        payment_provider: 'razorpay'
      };

      const result = parsePricingData(validJSON);

      expect(result.success).toBe(true);
      expect(result.data?.paymentProvider).toBe('razorpay');
    });

    it('should parse base64 encoded data with payment_provider', () => {
      const validJSON = {
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
        redirect_url: 'https://example.com/callback',
        payment_provider: 'pinelabs'
      };

      const base64String = btoa(JSON.stringify(validJSON));
      const result = parsePricingData(base64String);

      expect(result.success).toBe(true);
      expect(result.data?.paymentProvider).toBe('pinelabs');
    });

    it('should reject invalid base64 string', () => {
      const invalidBase64 = 'not!valid@base64#string';
      const result = parsePricingData(invalidBase64);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('storePricingData and getStoredPricingData', () => {
    it('should store and retrieve pricing data', () => {
      const pricingData: PricingData = {
        plans: [
          {
            plan_id: 'basic',
            name: 'Basic',
            monthlyAmount: 999,
            annualAmount: 9990,
            features: ['Feature 1', 'Feature 2']
          },
          {
            plan_id: 'pro',
            name: 'Pro',
            monthlyAmount: 1999,
            annualAmount: 19990,
            features: ['Feature 3']
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthlyAmount: 2999,
            annualAmount: 29990,
            features: ['Feature 4']
          }
        ],
        redirectUrl: 'https://example.com/callback'
      };

      storePricingData(pricingData);
      const retrieved = getStoredPricingData();

      expect(retrieved).toEqual(pricingData);
    });

    it('should return null when no data is stored', () => {
      const retrieved = getStoredPricingData();
      expect(retrieved).toBeNull();
    });

    it('should overwrite existing data', () => {
      const data1: PricingData = {
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
            features: ['Feature 2']
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthlyAmount: 2999,
            annualAmount: 29990,
            features: ['Feature 3']
          }
        ],
        redirectUrl: 'https://example.com/callback1'
      };

      const data2: PricingData = {
        plans: [
          {
            plan_id: 'starter',
            name: 'Starter',
            monthlyAmount: 499,
            annualAmount: 4990,
            features: ['Feature A']
          },
          {
            plan_id: 'growth',
            name: 'Growth',
            monthlyAmount: 1499,
            annualAmount: 14990,
            features: ['Feature B']
          },
          {
            plan_id: 'scale',
            name: 'Scale',
            monthlyAmount: 2499,
            annualAmount: 24990,
            features: ['Feature C']
          }
        ],
        redirectUrl: 'https://example.com/callback2'
      };

      storePricingData(data1);
      storePricingData(data2);
      const retrieved = getStoredPricingData();

      expect(retrieved).toEqual(data2);
      expect(retrieved?.redirectUrl).toBe('https://example.com/callback2');
    });
  });

  describe('clearPricingData', () => {
    it('should clear stored pricing data', () => {
      const pricingData: PricingData = {
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
            features: ['Feature 2']
          },
          {
            plan_id: 'enterprise',
            name: 'Enterprise',
            monthlyAmount: 2999,
            annualAmount: 29990,
            features: ['Feature 3']
          }
        ],
        redirectUrl: 'https://example.com/callback'
      };

      storePricingData(pricingData);
      clearPricingData();
      const retrieved = getStoredPricingData();

      expect(retrieved).toBeNull();
    });
  });

  describe('parseAndStorePricingData', () => {
    it('should parse, validate, and store valid data', () => {
      const validJSON = {
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
        redirect_url: 'https://example.com/callback'
      };

      const result = parseAndStorePricingData(validJSON);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const stored = getStoredPricingData();
      expect(stored).toEqual(result.data);
    });

    it('should not store data when parsing fails', () => {
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

      const result = parseAndStorePricingData(invalidJSON);

      expect(result.success).toBe(false);

      const stored = getStoredPricingData();
      expect(stored).toBeNull();
    });
  });
});
