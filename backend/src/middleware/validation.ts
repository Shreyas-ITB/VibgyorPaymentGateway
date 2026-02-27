/**
 * Input Validation and Sanitization Middleware
 * Validates: Requirements 1.4
 * 
 * Provides middleware for:
 * - Validating JSON structure and field types
 * - Sanitizing user inputs to prevent XSS attacks
 * - Validating request body schemas
 */

import { Request, Response, NextFunction } from 'express';
import validator from 'validator';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

// Create DOMPurify instance with jsdom
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

/**
 * Sanitize a string value to prevent XSS attacks
 * @param value - The string to sanitize
 * @param preserveSpecialChars - If true, only trim whitespace without HTML sanitization (for cryptographic values)
 */
export function sanitizeString(value: string, preserveSpecialChars: boolean = false): string {
  if (typeof value !== 'string') {
    return value;
  }
  
  // For cryptographic values (signatures, hashes, IDs), only trim
  if (preserveSpecialChars) {
    return validator.trim(value);
  }
  
  // Remove any HTML tags and scripts
  const sanitized = purify.sanitize(value, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Trim whitespace
  return validator.trim(sanitized);
}

/**
 * Fields that should preserve special characters (cryptographic values)
 */
const PRESERVE_FIELDS = new Set([
  'signature',
  'orderId',
  'paymentId',
  'order_id',
  'payment_id',
  'webhookSignature',
  'x-razorpay-signature',
  'x-pinelabs-signature'
]);

/**
 * Recursively sanitize all string values in an object
 * @param obj - The object to sanitize
 * @param fieldPath - Current field path for checking if it should be preserved
 */
export function sanitizeObject(obj: any, fieldPath: string = ''): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    const shouldPreserve = PRESERVE_FIELDS.has(fieldPath);
    return sanitizeString(obj, shouldPreserve);
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item, index) => sanitizeObject(item, `${fieldPath}[${index}]`));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newPath = fieldPath ? `${fieldPath}.${key}` : key;
        sanitized[key] = sanitizeObject(obj[key], newPath);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware to sanitize request body
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Validation schema type definitions
 */
export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  min?: number;
  max?: number;
  enum?: any[];
  pattern?: RegExp;
  items?: ValidationRule;
  properties?: { [key: string]: ValidationRule };
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

/**
 * Validate a value against a validation rule
 */
function validateValue(value: any, rule: ValidationRule, fieldName: string): string | null {
  // Check required
  if (rule.required && (value === undefined || value === null)) {
    return `${fieldName} is required`;
  }
  
  // If not required and value is undefined/null, skip further validation
  if (!rule.required && (value === undefined || value === null)) {
    return null;
  }
  
  // Check type
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  if (actualType !== rule.type) {
    return `${fieldName} must be of type ${rule.type}`;
  }
  
  // Type-specific validations
  if (rule.type === 'string') {
    if (typeof value !== 'string') {
      return `${fieldName} must be a string`;
    }
    
    if (rule.min !== undefined && value.length < rule.min) {
      return `${fieldName} must be at least ${rule.min} characters`;
    }
    
    if (rule.max !== undefined && value.length > rule.max) {
      return `${fieldName} must be at most ${rule.max} characters`;
    }
    
    if (rule.pattern && !rule.pattern.test(value)) {
      return `${fieldName} has invalid format`;
    }
  }
  
  if (rule.type === 'number') {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${fieldName} must be a valid number`;
    }
    
    if (rule.min !== undefined && value < rule.min) {
      return `${fieldName} must be at least ${rule.min}`;
    }
    
    if (rule.max !== undefined && value > rule.max) {
      return `${fieldName} must be at most ${rule.max}`;
    }
  }
  
  if (rule.type === 'array') {
    if (!Array.isArray(value)) {
      return `${fieldName} must be an array`;
    }
    
    if (rule.min !== undefined && value.length < rule.min) {
      return `${fieldName} must have at least ${rule.min} items`;
    }
    
    if (rule.max !== undefined && value.length > rule.max) {
      return `${fieldName} must have at most ${rule.max} items`;
    }
    
    // Validate array items if items rule is provided
    if (rule.items) {
      for (let i = 0; i < value.length; i++) {
        const itemError = validateValue(value[i], rule.items, `${fieldName}[${i}]`);
        if (itemError) {
          return itemError;
        }
      }
    }
  }
  
  if (rule.type === 'object') {
    if (typeof value !== 'object' || Array.isArray(value) || value === null) {
      return `${fieldName} must be an object`;
    }
    
    // Validate object properties if properties rule is provided
    if (rule.properties) {
      for (const propName in rule.properties) {
        const propRule = rule.properties[propName];
        const propValue = value[propName];
        const propError = validateValue(propValue, propRule, `${fieldName}.${propName}`);
        if (propError) {
          return propError;
        }
      }
    }
  }
  
  // Check enum
  if (rule.enum && !rule.enum.includes(value)) {
    return `${fieldName} must be one of: ${rule.enum.join(', ')}`;
  }
  
  return null;
}

/**
 * Validate request body against a schema
 */
export function validateSchema(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    
    // Validate each field in the schema
    for (const fieldName in schema) {
      const rule = schema[fieldName];
      const value = req.body[fieldName];
      
      const error = validateValue(value, rule, fieldName);
      if (error) {
        errors.push(error);
      }
    }
    
    // If there are validation errors, return 400
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Validation failed',
          details: errors
        }
      });
      return;
    }
    
    next();
  };
}

/**
 * Middleware to validate JSON content type
 */
export function validateJsonContentType(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers['content-type'];
  
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (!contentType || !contentType.includes('application/json')) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be application/json'
        }
      });
      return;
    }
  }
  
  next();
}

/**
 * Middleware to validate JSON body is present
 */
export function validateJsonBody(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Request body must be a valid JSON object'
        }
      });
      return;
    }
  }
  
  next();
}
