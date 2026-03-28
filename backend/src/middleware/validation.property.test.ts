/**
 * Property-based tests for input validation and sanitization
 * Validates: Requirements 1.4
 */

import * as fc from 'fast-check';
import { sanitizeString, sanitizeObject, ValidationSchema } from './validation';
import { Request, Response } from 'express';

describe('Input Validation and Sanitization - Property Tests', () => {
  describe('sanitizeString properties', () => {
    // Feature: vibgyor-payment-gateway, Property: Sanitized strings should never contain script tags
    it('should never contain script tags after sanitization', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const result = sanitizeString(input);
            expect(result).not.toMatch(/<script/i);
            expect(result).not.toMatch(/<\/script>/i);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: vibgyor-payment-gateway, Property: Sanitized strings should never contain HTML tags
    it('should never contain HTML tags after sanitization', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const result = sanitizeString(input);
            expect(result).not.toMatch(/<[^>]+>/);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: vibgyor-payment-gateway, Property: Sanitization should be idempotent
    it('should be idempotent - sanitizing twice gives same result', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const once = sanitizeString(input);
            const twice = sanitizeString(once);
            expect(once).toBe(twice);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: vibgyor-payment-gateway, Property: Sanitization should preserve alphanumeric characters
    it('should preserve alphanumeric characters', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''))),
          (input) => {
            const result = sanitizeString(input);
            // Remove whitespace for comparison
            expect(result.replace(/\s/g, '')).toBe(input.replace(/\s/g, ''));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('sanitizeObject properties', () => {
    // Feature: vibgyor-payment-gateway, Property: Sanitized objects should preserve structure
    it('should preserve object structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string(),
            age: fc.integer(),
            active: fc.boolean()
          }),
          (input) => {
            const result = sanitizeObject(input);
            expect(Object.keys(result)).toEqual(Object.keys(input));
            expect(typeof result.age).toBe('number');
            expect(typeof result.active).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: vibgyor-payment-gateway, Property: Sanitized objects should preserve non-string values
    it('should preserve numbers and booleans', () => {
      fc.assert(
        fc.property(
          fc.record({
            count: fc.integer(),
            price: fc.float(),
            active: fc.boolean()
          }),
          (input) => {
            const result = sanitizeObject(input);
            expect(result.count).toBe(input.count);
            expect(result.price).toBe(input.price);
            expect(result.active).toBe(input.active);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: vibgyor-payment-gateway, Property: Sanitized nested objects should not contain HTML
    it('should remove HTML from all nested string values', () => {
      fc.assert(
        fc.property(
          fc.record({
            user: fc.record({
              name: fc.string(),
              bio: fc.string()
            })
          }),
          (input) => {
            const result = sanitizeObject(input);
            const allStrings = JSON.stringify(result);
            expect(allStrings).not.toMatch(/<[^>]+>/);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: vibgyor-payment-gateway, Property: Sanitization should handle arrays correctly
    it('should sanitize all elements in arrays', () => {
      fc.assert(
        fc.property(
          fc.record({
            tags: fc.array(fc.string(), { minLength: 1, maxLength: 10 })
          }),
          (input) => {
            const result = sanitizeObject(input);
            expect(Array.isArray(result.tags)).toBe(true);
            expect(result.tags.length).toBe(input.tags.length);
            
            // Check no HTML in any array element
            result.tags.forEach((tag: string) => {
              if (typeof tag === 'string') {
                expect(tag).not.toMatch(/<[^>]+>/);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Validation schema properties', () => {
    // Feature: vibgyor-payment-gateway, Property: Required fields should always fail when missing
    it('should always reject missing required fields', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (fieldName) => {
            const schema: ValidationSchema = {
              [fieldName]: {
                type: 'string',
                required: true
              }
            };

            const req = {
              body: {}
            } as Request;
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as unknown as Response;
            const next = jest.fn();

            // Import and use validateSchema
            const { validateSchema } = require('./validation');
            const middleware = validateSchema(schema);
            middleware(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
          }
        ),
        { numRuns: 50 }
      );
    });

    // Feature: vibgyor-payment-gateway, Property: Number validation should reject non-numbers
    it('should always reject non-number values for number fields', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (value) => {
            // Skip if the string is a valid number
            if (!isNaN(Number(value)) && value.trim() !== '') {
              return;
            }

            const schema: ValidationSchema = {
              amount: {
                type: 'number',
                required: true
              }
            };

            const req = {
              body: { amount: value }
            } as Request;
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as unknown as Response;
            const next = jest.fn();

            const { validateSchema } = require('./validation');
            const middleware = validateSchema(schema);
            middleware(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
          }
        ),
        { numRuns: 50 }
      );
    });

    // Feature: vibgyor-payment-gateway, Property: Enum validation should only accept listed values
    it('should only accept values in the enum list', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (value) => {
            const allowedValues = ['monthly', 'annual'];
            
            const schema: ValidationSchema = {
              cycle: {
                type: 'string',
                required: true,
                enum: allowedValues
              }
            };

            const req = {
              body: { cycle: value }
            } as Request;
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as unknown as Response;
            const next = jest.fn();

            const { validateSchema } = require('./validation');
            const middleware = validateSchema(schema);
            middleware(req, res, next);

            if (allowedValues.includes(value)) {
              expect(next).toHaveBeenCalled();
            } else {
              expect(next).not.toHaveBeenCalled();
              expect(res.status).toHaveBeenCalledWith(400);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: vibgyor-payment-gateway, Property: Min/max validation for numbers
    it('should enforce min and max constraints on numbers', () => {
      fc.assert(
        fc.property(
          fc.integer(),
          (value) => {
            const min = 1;
            const max = 1000;

            const schema: ValidationSchema = {
              amount: {
                type: 'number',
                required: true,
                min,
                max
              }
            };

            const req = {
              body: { amount: value }
            } as Request;
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as unknown as Response;
            const next = jest.fn();

            const { validateSchema } = require('./validation');
            const middleware = validateSchema(schema);
            middleware(req, res, next);

            if (value >= min && value <= max) {
              expect(next).toHaveBeenCalled();
            } else {
              expect(next).not.toHaveBeenCalled();
              expect(res.status).toHaveBeenCalledWith(400);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: vibgyor-payment-gateway, Property: String length validation
    it('should enforce min and max length constraints on strings', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (value) => {
            const min = 5;
            const max = 20;

            const schema: ValidationSchema = {
              name: {
                type: 'string',
                required: true,
                min,
                max
              }
            };

            const req = {
              body: { name: value }
            } as Request;
            const res = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as unknown as Response;
            const next = jest.fn();

            const { validateSchema } = require('./validation');
            const middleware = validateSchema(schema);
            middleware(req, res, next);

            if (value.length >= min && value.length <= max) {
              expect(next).toHaveBeenCalled();
            } else {
              expect(next).not.toHaveBeenCalled();
              expect(res.status).toHaveBeenCalledWith(400);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
