/**
 * Property-based tests for pricing data parser
 * Feature: vibgyor-payment-gateway, Property 1: Valid JSON Parsing and Storage
 * Feature: vibgyor-payment-gateway, Property 2: Invalid JSON Rejection
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 */

import * as fc from 'fast-check';
import {
  parsePricingData,
  parseAndStorePricingData,
  getStoredPricingData,
  clearPricingData
} from './pricing-data-parser.service';
import { ErrorCode } from '../models/api.models';

describe('PricingDataParser - Property Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  /**
   * Arbitrary generator for valid pricing plans
   */
  const validPricingPlanArbitrary = () =>
    fc.record({
      plan_id: fc.string({ minLength: 1, maxLength: 50 }),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      monthly_amount: fc.integer({ min: 1, max: 1000000 }),
      annual_amount: fc.integer({ min: 1, max: 10000000 }),
      features: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 20 })
    });

  /**
   * Arbitrary generator for valid redirect URLs
   */
  const validRedirectUrlArbitrary = () =>
    fc.oneof(
      fc.webUrl(),
      fc.constant('https://example.com/callback'),
      fc.constant('https://test.com/payment-result')
    );

  /**
   * Property 1: Valid JSON Parsing and Storage
   * 
   * For any valid JSON input containing exactly 3 pricing plans with all required fields
   * (plan_id, name, monthly_amount, annual_amount, features) and a redirect_url,
   * parsing the JSON and then retrieving the stored data should produce equivalent
   * pricing plans and redirect URL.
   * 
   * This property verifies:
   * 1. Valid JSON is successfully parsed
   * 2. All plan fields are correctly transformed (monthly_amount -> monthlyAmount, etc.)
   * 3. Data stored in session storage can be retrieved
   * 4. Retrieved data is equivalent to the original parsed data
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
   */
  describe('Property 1: Valid JSON Parsing and Storage', () => {
    it('should parse valid JSON and retrieve equivalent data from storage', () => {
      fc.assert(
        fc.property(
          fc.array(validPricingPlanArbitrary(), { minLength: 3, maxLength: 3 }),
          validRedirectUrlArbitrary(),
          (plans, redirectUrl) => {
            // Clear storage before test
            clearPricingData();

            // Create valid JSON structure
            const json = {
              plans: plans,
              redirect_url: redirectUrl
            };

            // Parse and store the data
            const parseResult = parseAndStorePricingData(json);

            // Verify parsing succeeded
            expect(parseResult.success).toBe(true);
            expect(parseResult.data).toBeDefined();

            // Retrieve stored data
            const retrieved = getStoredPricingData();

            // Verify data was stored
            expect(retrieved).not.toBeNull();

            // Verify all plans are present
            expect(retrieved!.plans).toHaveLength(3);

            // Verify redirect URL matches
            expect(retrieved!.redirectUrl).toBe(redirectUrl);

            // Verify each plan's fields are correctly transformed and preserved
            for (let i = 0; i < 3; i++) {
              expect(retrieved!.plans[i].plan_id).toBe(plans[i].plan_id);
              expect(retrieved!.plans[i].name).toBe(plans[i].name);
              expect(retrieved!.plans[i].monthlyAmount).toBe(plans[i].monthly_amount);
              expect(retrieved!.plans[i].annualAmount).toBe(plans[i].annual_amount);
              expect(retrieved!.plans[i].features).toEqual(plans[i].features);
            }

            // Verify retrieved data equals parsed data
            expect(retrieved).toEqual(parseResult.data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle JSON strings and objects equivalently', () => {
      fc.assert(
        fc.property(
          fc.array(validPricingPlanArbitrary(), { minLength: 3, maxLength: 3 }),
          validRedirectUrlArbitrary(),
          (plans, redirectUrl) => {
            clearPricingData();

            const jsonObject = {
              plans: plans,
              redirect_url: redirectUrl
            };

            // Parse as object
            const resultFromObject = parsePricingData(jsonObject);

            // Parse as string
            const jsonString = JSON.stringify(jsonObject);
            const resultFromString = parsePricingData(jsonString);

            // Both should succeed
            expect(resultFromObject.success).toBe(true);
            expect(resultFromString.success).toBe(true);

            // Both should produce equivalent data
            expect(resultFromString.data).toEqual(resultFromObject.data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all feature strings exactly', () => {
      fc.assert(
        fc.property(
          fc.array(validPricingPlanArbitrary(), { minLength: 3, maxLength: 3 }),
          validRedirectUrlArbitrary(),
          (plans, redirectUrl) => {
            clearPricingData();

            const json = {
              plans: plans,
              redirect_url: redirectUrl
            };

            parseAndStorePricingData(json);
            const retrieved = getStoredPricingData();

            // Verify every feature string is preserved exactly
            for (let i = 0; i < 3; i++) {
              expect(retrieved!.plans[i].features.length).toBe(plans[i].features.length);
              for (let j = 0; j < plans[i].features.length; j++) {
                expect(retrieved!.plans[i].features[j]).toBe(plans[i].features[j]);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple parse and store operations correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              plans: fc.array(validPricingPlanArbitrary(), { minLength: 3, maxLength: 3 }),
              redirectUrl: validRedirectUrlArbitrary()
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (dataArray) => {
            // Parse and store multiple times (last one should win)
            let lastData;
            for (const data of dataArray) {
              const json = {
                plans: data.plans,
                redirect_url: data.redirectUrl
              };
              const parseResult = parseAndStorePricingData(json);
              expect(parseResult.success).toBe(true);
              lastData = parseResult.data;
            }

            // Retrieved data should match the last stored data
            const retrieved = getStoredPricingData();
            expect(retrieved).toEqual(lastData);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Invalid JSON Rejection
   * 
   * For any JSON input that is malformed or missing required fields
   * (plan_id, name, amounts, features, or redirect_url), the parser should
   * reject the input and return an error without storing any data.
   * 
   * This property verifies:
   * 1. Invalid JSON is rejected with success: false
   * 2. An error object with code and message is returned
   * 3. No data is stored in session storage when parsing fails
   * 
   * **Validates: Requirements 1.4**
   */
  describe('Property 2: Invalid JSON Rejection', () => {
    it('should reject JSON with wrong number of plans', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.array(validPricingPlanArbitrary(), { minLength: 0, maxLength: 2 }), // Too few
            fc.array(validPricingPlanArbitrary(), { minLength: 4, maxLength: 10 }) // Too many
          ),
          validRedirectUrlArbitrary(),
          (plans, redirectUrl) => {
            clearPricingData();

            const json = {
              plans: plans,
              redirect_url: redirectUrl
            };

            const result = parseAndStorePricingData(json);

            // Should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error!.code).toBe(ErrorCode.INVALID_JSON);
            expect(result.error!.message).toContain('exactly 3 plans required');

            // Should not store any data
            const stored = getStoredPricingData();
            expect(stored).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject JSON missing redirect_url', () => {
      fc.assert(
        fc.property(
          fc.array(validPricingPlanArbitrary(), { minLength: 3, maxLength: 3 }),
          (plans) => {
            clearPricingData();

            // Missing redirect_url
            const json = {
              plans: plans
            };

            const result = parseAndStorePricingData(json);

            // Should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error!.code).toBe(ErrorCode.INVALID_JSON);
            expect(result.error!.message).toContain('redirect_url');

            // Should not store any data
            const stored = getStoredPricingData();
            expect(stored).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject JSON with plans missing required fields', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2 }), // Which plan to corrupt
          fc.oneof(
            fc.constant('plan_id'),
            fc.constant('name'),
            fc.constant('monthly_amount'),
            fc.constant('annual_amount'),
            fc.constant('features')
          ), // Which field to remove
          validRedirectUrlArbitrary(),
          (planIndex, fieldToRemove, redirectUrl) => {
            clearPricingData();

            // Create 3 valid plans
            const plans = [
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
            ];

            // Remove the specified field from the specified plan
            delete (plans[planIndex] as any)[fieldToRemove];

            const json = {
              plans: plans,
              redirect_url: redirectUrl
            };

            const result = parseAndStorePricingData(json);

            // Should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error!.code).toBe(ErrorCode.INVALID_JSON);

            // Should not store any data
            const stored = getStoredPricingData();
            expect(stored).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject JSON with invalid field types', () => {
      fc.assert(
        fc.property(
          validRedirectUrlArbitrary(),
          (redirectUrl) => {
            clearPricingData();

            // Create plans with invalid types
            const invalidPlans = [
              {
                plan_id: 'basic',
                name: 'Basic',
                monthly_amount: 'not a number', // Invalid type
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
            ];

            const json = {
              plans: invalidPlans,
              redirect_url: redirectUrl
            };

            const result = parseAndStorePricingData(json);

            // Should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Should not store any data
            const stored = getStoredPricingData();
            expect(stored).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject JSON with negative or zero amounts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 0 }), // Invalid amount
          validRedirectUrlArbitrary(),
          (invalidAmount, redirectUrl) => {
            clearPricingData();

            const plans = [
              {
                plan_id: 'basic',
                name: 'Basic',
                monthly_amount: invalidAmount, // Invalid
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
            ];

            const json = {
              plans: plans,
              redirect_url: redirectUrl
            };

            const result = parseAndStorePricingData(json);

            // Should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Should not store any data
            const stored = getStoredPricingData();
            expect(stored).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject JSON with empty features array', () => {
      fc.assert(
        fc.property(
          validRedirectUrlArbitrary(),
          (redirectUrl) => {
            clearPricingData();

            const plans = [
              {
                plan_id: 'basic',
                name: 'Basic',
                monthly_amount: 999,
                annual_amount: 9990,
                features: [] // Empty features
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
            ];

            const json = {
              plans: plans,
              redirect_url: redirectUrl
            };

            const result = parseAndStorePricingData(json);

            // Should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error!.message).toContain('features array cannot be empty');

            // Should not store any data
            const stored = getStoredPricingData();
            expect(stored).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject malformed JSON strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('{ invalid json }'),
            fc.constant('not json at all'),
            fc.constant('{ "plans": ['),
            fc.constant('null'),
            fc.constant('undefined')
          ),
          (malformedJSON) => {
            clearPricingData();

            const result = parseAndStorePricingData(malformedJSON);

            // Should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Should not store any data
            const stored = getStoredPricingData();
            expect(stored).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-object inputs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.integer(),
            fc.boolean(),
            fc.string()
          ),
          (invalidInput) => {
            clearPricingData();

            const result = parseAndStorePricingData(invalidInput);

            // Should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Should not store any data
            const stored = getStoredPricingData();
            expect(stored).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
