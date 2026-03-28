/**
 * Tests for input validation and sanitization middleware
 * Validates: Requirements 1.4
 */

import { Request, Response } from 'express';
import {
  sanitizeString,
  sanitizeObject,
  sanitizeInput,
  validateSchema,
  validateJsonContentType,
  validateJsonBody,
  ValidationSchema
} from './validation';

describe('Input Validation and Sanitization', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags from strings', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      expect(result).toBe('Hello');
    });

    it('should remove malicious script tags', () => {
      const input = '<img src=x onerror="alert(1)">Test';
      const result = sanitizeString(input);
      expect(result).toBe('Test');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should handle empty strings', () => {
      const input = '';
      const result = sanitizeString(input);
      expect(result).toBe('');
    });

    it('should handle strings with only HTML', () => {
      const input = '<div><p>Text</p></div>';
      const result = sanitizeString(input);
      expect(result).toBe('Text');
    });

    it('should preserve special characters when preserveSpecialChars is true', () => {
      const input = '  <signature>abc123  ';
      const result = sanitizeString(input, true);
      expect(result).toBe('<signature>abc123');
    });

    it('should only trim whitespace for cryptographic values', () => {
      const input = '  abc<>123!@#  ';
      const result = sanitizeString(input, true);
      expect(result).toBe('abc<>123!@#');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in an object', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        email: '  test@example.com  ',
        age: 25
      };
      const result = sanitizeObject(input);
      expect(result).toEqual({
        name: 'John',
        email: 'test@example.com',
        age: 25
      });
    });

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          profile: {
            bio: '<script>alert(1)</script>Developer'
          }
        }
      };
      const result = sanitizeObject(input);
      expect(result).toEqual({
        user: {
          name: 'John',
          profile: {
            bio: 'Developer'
          }
        }
      });
    });

    it('should sanitize arrays', () => {
      const input = {
        tags: ['tag1<script>alert(1)</script>', '  tag2  ', '<b>tag3</b>']
      };
      const result = sanitizeObject(input);
      expect(result).toEqual({
        tags: ['tag1', 'tag2', 'tag3']
      });
    });

    it('should handle null and undefined values', () => {
      const input = {
        name: 'John',
        email: null,
        phone: undefined
      };
      const result = sanitizeObject(input);
      expect(result).toEqual({
        name: 'John',
        email: null,
        phone: undefined
      });
    });

    it('should preserve numbers and booleans', () => {
      const input = {
        count: 42,
        active: true,
        price: 99.99
      };
      const result = sanitizeObject(input);
      expect(result).toEqual(input);
    });

    it('should preserve special characters in signature fields', () => {
      const input = {
        signature: '  <abc>123!@#  ',
        orderId: '  order<>123  ',
        paymentId: '  pay<>456  ',
        name: '<script>alert(1)</script>John'
      };
      const result = sanitizeObject(input);
      expect(result).toEqual({
        signature: '<abc>123!@#',
        orderId: 'order<>123',
        paymentId: 'pay<>456',
        name: 'John'
      });
    });
  });

  describe('sanitizeInput middleware', () => {
    it('should sanitize request body', () => {
      const req = {
        body: {
          name: '<script>alert("xss")</script>John',
          email: '  test@example.com  '
        }
      } as Request;
      const res = {} as Response;
      const next = jest.fn();

      sanitizeInput(req, res, next);

      expect(req.body).toEqual({
        name: 'John',
        email: 'test@example.com'
      });
      expect(next).toHaveBeenCalled();
    });

    it('should handle empty body', () => {
      const req = { body: {} } as Request;
      const res = {} as Response;
      const next = jest.fn();

      sanitizeInput(req, res, next);

      expect(req.body).toEqual({});
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing body', () => {
      const req = {} as Request;
      const res = {} as Response;
      const next = jest.fn();

      sanitizeInput(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateSchema middleware', () => {
    const schema: ValidationSchema = {
      name: {
        type: 'string',
        required: true,
        min: 1,
        max: 100
      },
      age: {
        type: 'number',
        required: true,
        min: 0,
        max: 150
      },
      email: {
        type: 'string',
        required: false
      }
    };

    it('should pass validation for valid data', () => {
      const req = {
        body: {
          name: 'John Doe',
          age: 30,
          email: 'john@example.com'
        }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      const middleware = validateSchema(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail validation for missing required field', () => {
      const req = {
        body: {
          age: 30
        }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      const middleware = validateSchema(schema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Validation failed',
          details: ['name is required']
        }
      });
    });

    it('should fail validation for wrong type', () => {
      const req = {
        body: {
          name: 'John Doe',
          age: 'thirty'
        }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      const middleware = validateSchema(schema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Validation failed',
          details: ['age must be of type number']
        }
      });
    });

    it('should fail validation for value below minimum', () => {
      const req = {
        body: {
          name: 'John Doe',
          age: -5
        }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      const middleware = validateSchema(schema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Validation failed',
          details: ['age must be at least 0']
        }
      });
    });

    it('should fail validation for string too short', () => {
      const req = {
        body: {
          name: '',
          age: 30
        }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      const middleware = validateSchema(schema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should pass validation when optional field is missing', () => {
      const req = {
        body: {
          name: 'John Doe',
          age: 30
        }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      const middleware = validateSchema(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('validateSchema with enum', () => {
    const schema: ValidationSchema = {
      status: {
        type: 'string',
        required: true,
        enum: ['active', 'inactive', 'pending']
      }
    };

    it('should pass validation for valid enum value', () => {
      const req = {
        body: { status: 'active' }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      const middleware = validateSchema(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should fail validation for invalid enum value', () => {
      const req = {
        body: { status: 'invalid' }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      const middleware = validateSchema(schema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateJsonContentType middleware', () => {
    it('should pass for POST with application/json', () => {
      const req = {
        method: 'POST',
        headers: { 'content-type': 'application/json' }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      validateJsonContentType(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail for POST without application/json', () => {
      const req = {
        method: 'POST',
        headers: { 'content-type': 'text/plain' }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      validateJsonContentType(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be application/json'
        }
      });
    });

    it('should pass for GET requests regardless of content-type', () => {
      const req = {
        method: 'GET',
        headers: {}
      } as Request;
      const res = {} as Response;
      const next = jest.fn();

      validateJsonContentType(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateJsonBody middleware', () => {
    it('should pass for POST with valid JSON object', () => {
      const req = {
        method: 'POST',
        body: { name: 'John' }
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      validateJsonBody(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail for POST with array body', () => {
      const req = {
        method: 'POST',
        body: ['item1', 'item2']
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      validateJsonBody(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Request body must be a valid JSON object'
        }
      });
    });

    it('should fail for POST with null body', () => {
      const req = {
        method: 'POST',
        body: null
      } as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      const next = jest.fn();

      validateJsonBody(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should pass for GET requests', () => {
      const req = {
        method: 'GET',
        body: null
      } as Request;
      const res = {} as Response;
      const next = jest.fn();

      validateJsonBody(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
