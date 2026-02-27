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
  addons?: Array<{
    addon_id?: string;
    name?: string;
    description?: string;
    monthly_amount?: number;
    annual_amount?: number;
  }>;
  redirect_url?: string;
  payment_provider?: string;
}

/**
 * Decode base64 string to JSON string
 * Handles UTF-8 encoded base64 (supports Unicode characters like emojis)
 * @param base64String Base64 encoded string
 * @returns Decoded JSON string
 */
function decodeBase64(base64String: string): string {
  try {
    // Use atob for browser-based base64 decoding
    const decoded = atob(base64String);
    
    // Convert from percent-encoded UTF-8 back to Unicode
    try {
      return decodeURIComponent(decoded.split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (e) {
      // If UTF-8 decoding fails, return the plain decoded string
      // (for backward compatibility with non-UTF-8 encoded data)
      return decoded;
    }
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
      const trimmedJson = json.trim();
      
      // Improved Base64 detection:
      // 1. Check if it starts with { or [ (JSON indicators)
      // 2. If not, assume it's Base64
      // 3. Base64 strings are typically longer and don't start with JSON characters
      const startsWithJsonChar = trimmedJson.startsWith('{') || trimmedJson.startsWith('[');
      const isLikelyBase64 = !startsWithJsonChar && /^[A-Za-z0-9+/]+=*$/.test(trimmedJson);
      
      if (isLikelyBase64 || (!startsWithJsonChar && trimmedJson.length > 50)) {
        // Try Base64 decoding first
        try {
          const decoded = decodeBase64(trimmedJson);
          data = JSON.parse(decoded);
        } catch (base64Error) {
          // If base64 decoding fails, try parsing as regular JSON
          try {
            data = JSON.parse(trimmedJson);
          } catch (jsonError) {
            throw new Error('Failed to parse as base64 or JSON: ' + (base64Error instanceof Error ? base64Error.message : 'Unknown error'));
          }
        }
      } else {
        // Parse as regular JSON string
        data = JSON.parse(trimmedJson);
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
      addons: data.addons?.map(addon => ({
        addon_id: addon.addon_id!,
        name: addon.name!,
        description: addon.description!,
        monthlyAmount: addon.monthly_amount!,
        annualAmount: addon.annual_amount!
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

  // Validate addons if present (optional)
  if (data.addons) {
    if (!Array.isArray(data.addons)) {
      return 'Invalid JSON: addons must be an array';
    }

    for (let i = 0; i < data.addons.length; i++) {
      const addon = data.addons[i];
      const addonError = validateAddon(addon, i);
      if (addonError) {
        return addonError;
      }
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
 * Validate individual addon structure
 * @param addon Raw addon object
 * @param index Addon index for error messages
 * @returns Error message if invalid, null if valid
 */
function validateAddon(addon: any, index: number): string | null {
  if (!addon || typeof addon !== 'object') {
    return `Invalid JSON: addon ${index} must be an object`;
  }

  // Check addon_id
  if (!addon.addon_id || typeof addon.addon_id !== 'string') {
    return `Invalid JSON: addon ${index} missing required field 'addon_id' (string)`;
  }

  // Check name
  if (!addon.name || typeof addon.name !== 'string') {
    return `Invalid JSON: addon ${index} missing required field 'name' (string)`;
  }

  // Check description
  if (!addon.description || typeof addon.description !== 'string') {
    return `Invalid JSON: addon ${index} missing required field 'description' (string)`;
  }

  // Check monthly_amount
  if (typeof addon.monthly_amount !== 'number' || addon.monthly_amount <= 0) {
    return `Invalid JSON: addon ${index} missing required field 'monthly_amount' (positive number)`;
  }

  // Check annual_amount
  if (typeof addon.annual_amount !== 'number' || addon.annual_amount <= 0) {
    return `Invalid JSON: addon ${index} missing required field 'annual_amount' (positive number)`;
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
