/**
 * Service for parsing and validating pricing data JSON
 * Handles incoming JSON from external sites and stores valid data in session storage
 */

import { PricingData } from '../models/pricing.models';
import { ErrorCode } from '../models/api.models';

const SESSION_STORAGE_KEY = 'vibgyor_pricing_data';

/**
 * Result of parsing operation
 */
export interface ParseResult {
  success: boolean;
  data?: PricingData;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Raw JSON structure from external site
 */
interface RawPricingJSON {
  plans?: Array<{
    plan_id?: string;
    name?: string;
    monthly_amount?: number;
    annual_amount?: number;
    features?: string[];
  }>;
  redirect_url?: string;
  payment_provider?: string;
}

/**
 * Decode base64 string to JSON string
 * @param base64String Base64 encoded string
 * @returns Decoded JSON string
 */
function decodeBase64(base64String: string): string {
  try {
    // Use atob for browser-based base64 decoding
    return atob(base64String);
  } catch (error) {
    throw new Error('Invalid base64 string');
  }
}

/**
 * Parse and validate incoming JSON pricing data
 * Supports both plain JSON and base64 encoded JSON
 * @param json Raw JSON object, JSON string, or base64 encoded JSON string
 * @returns ParseResult with success status and data or error
 */
export function parsePricingData(json: any): ParseResult {
  try {
    let data: RawPricingJSON;

    if (typeof json === 'string') {
      // Try to detect if it's base64 encoded
      // Base64 strings typically don't contain spaces and have specific character set
      const isLikelyBase64 = /^[A-Za-z0-9+/]+=*$/.test(json.trim());
      
      if (isLikelyBase64) {
        try {
          // Try to decode as base64
          const decoded = decodeBase64(json.trim());
          data = JSON.parse(decoded);
        } catch (base64Error) {
          // If base64 decoding fails, try parsing as regular JSON
          try {
            data = JSON.parse(json);
          } catch (jsonError) {
            throw new Error('Failed to parse as base64 or JSON');
          }
        }
      } else {
        // Parse as regular JSON string
        data = JSON.parse(json);
      }
    } else {
      // Already an object
      data = json;
    }

    // Validate structure
    const validationError = validatePricingData(data);
    if (validationError) {
      return {
        success: false,
        error: {
          code: ErrorCode.INVALID_JSON,
          message: validationError
        }
      };
    }

    // Transform to internal format
    const pricingData: PricingData = {
      plans: data.plans!.map(plan => ({
        plan_id: plan.plan_id!,
        name: plan.name!,
        monthlyAmount: plan.monthly_amount!,
        annualAmount: plan.annual_amount!,
        features: plan.features!
      })),
      redirectUrl: data.redirect_url!,
      paymentProvider: data.payment_provider as 'razorpay' | 'pinelabs' | undefined
    };

    return {
      success: true,
      data: pricingData
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: ErrorCode.INVALID_JSON,
        message: error instanceof Error ? error.message : 'Failed to parse JSON'
      }
    };
  }
}

/**
 * Validate pricing data structure
 * @param data Raw pricing data object
 * @returns Error message if invalid, null if valid
 */
function validatePricingData(data: RawPricingJSON): string | null {
  // Check if data is an object
  if (!data || typeof data !== 'object') {
    return 'Invalid JSON: data must be an object';
  }

  // Check redirect_url
  if (!data.redirect_url || typeof data.redirect_url !== 'string') {
    return 'Invalid JSON: redirect_url is required and must be a string';
  }

  // Check plans array
  if (!Array.isArray(data.plans)) {
    return 'Invalid JSON: plans must be an array';
  }

  // Check exactly 3 plans
  if (data.plans.length !== 3) {
    return `Invalid JSON: exactly 3 plans required, got ${data.plans.length}`;
  }

  // Validate each plan
  for (let i = 0; i < data.plans.length; i++) {
    const plan = data.plans[i];
    const planError = validatePlan(plan, i);
    if (planError) {
      return planError;
    }
  }

  return null;
}

/**
 * Validate individual plan structure
 * @param plan Raw plan object
 * @param index Plan index for error messages
 * @returns Error message if invalid, null if valid
 */
function validatePlan(plan: any, index: number): string | null {
  if (!plan || typeof plan !== 'object') {
    return `Invalid JSON: plan ${index} must be an object`;
  }

  // Check plan_id
  if (!plan.plan_id || typeof plan.plan_id !== 'string') {
    return `Invalid JSON: plan ${index} missing required field 'plan_id' (string)`;
  }

  // Check name
  if (!plan.name || typeof plan.name !== 'string') {
    return `Invalid JSON: plan ${index} missing required field 'name' (string)`;
  }

  // Check monthly_amount
  if (typeof plan.monthly_amount !== 'number' || plan.monthly_amount <= 0) {
    return `Invalid JSON: plan ${index} missing required field 'monthly_amount' (positive number)`;
  }

  // Check annual_amount
  if (typeof plan.annual_amount !== 'number' || plan.annual_amount <= 0) {
    return `Invalid JSON: plan ${index} missing required field 'annual_amount' (positive number)`;
  }

  // Check features
  if (!Array.isArray(plan.features)) {
    return `Invalid JSON: plan ${index} missing required field 'features' (array)`;
  }

  if (plan.features.length === 0) {
    return `Invalid JSON: plan ${index} features array cannot be empty`;
  }

  // Validate all features are strings
  for (let j = 0; j < plan.features.length; j++) {
    if (typeof plan.features[j] !== 'string') {
      return `Invalid JSON: plan ${index} feature ${j} must be a string`;
    }
  }

  return null;
}

/**
 * Store valid pricing data in session storage
 * @param data Validated pricing data
 */
export function storePricingData(data: PricingData): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to store pricing data in session storage:', error);
    throw new Error('Failed to store pricing data');
  }
}

/**
 * Retrieve pricing data from session storage
 * @returns Stored pricing data or null if not found
 */
export function getStoredPricingData(): PricingData | null {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as PricingData;
  } catch (error) {
    console.error('Failed to retrieve pricing data from session storage:', error);
    return null;
  }
}

/**
 * Clear pricing data from session storage
 */
export function clearPricingData(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear pricing data from session storage:', error);
  }
}

/**
 * Parse, validate, and store pricing data in one operation
 * @param json Raw JSON object or string from external site
 * @returns ParseResult with success status and data or error
 */
export function parseAndStorePricingData(json: any): ParseResult {
  const result = parsePricingData(json);
  
  if (result.success && result.data) {
    try {
      storePricingData(result.data);
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.STORAGE_ERROR,
          message: 'Failed to store pricing data'
        }
      };
    }
  }
  
  return result;
}
