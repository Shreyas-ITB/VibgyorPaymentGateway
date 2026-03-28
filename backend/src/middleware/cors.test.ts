/**
 * Unit tests for CORS middleware
 */

import { getAllowedOrigins, corsOptions } from './cors';

describe('CORS Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getAllowedOrigins', () => {
    it('should return wildcard in development when ALLOWED_ORIGINS is not set', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;

      const result = getAllowedOrigins();

      expect(result).toBe('*');
    });

    it('should throw error in production when ALLOWED_ORIGINS is not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;

      expect(() => getAllowedOrigins()).toThrow(
        'ALLOWED_ORIGINS environment variable must be set in production'
      );
    });

    it('should parse single origin from environment variable', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const result = getAllowedOrigins();

      expect(result).toEqual(['https://example.com']);
    });

    it('should parse multiple comma-separated origins', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com,https://admin.example.com';

      const result = getAllowedOrigins();

      expect(result).toEqual([
        'https://example.com',
        'https://app.example.com',
        'https://admin.example.com'
      ]);
    });

    it('should trim whitespace from origins', () => {
      process.env.ALLOWED_ORIGINS = ' https://example.com , https://app.example.com ';

      const result = getAllowedOrigins();

      expect(result).toEqual([
        'https://example.com',
        'https://app.example.com'
      ]);
    });
  });

  describe('corsOptions.origin callback', () => {
    it('should allow requests with no origin in development', (done) => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;

      const callback = (err: Error | null, origin?: any) => {
        expect(err).toBeNull();
        expect(origin).toBe(true);
        done();
      };

      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin(undefined, callback);
      }
    });

    it('should allow all origins when wildcard is set', (done) => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;

      const callback = (err: Error | null, origin?: any) => {
        expect(err).toBeNull();
        expect(origin).toBe(true);
        done();
      };

      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('https://any-domain.com', callback);
      }
    });

    it('should allow origin that is in the allowed list', (done) => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';

      const callback = (err: Error | null, origin?: any) => {
        expect(err).toBeNull();
        expect(origin).toBe(true);
        done();
      };

      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('https://example.com', callback);
      }
    });

    it('should reject origin that is not in the allowed list', (done) => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const callback = (err: Error | null) => {
        expect(err).toBeInstanceOf(Error);
        expect(err?.message).toBe('Not allowed by CORS');
        done();
      };

      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('https://malicious.com', callback);
      }
    });

    it('should reject requests with no origin in production when origins are specified', (done) => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const callback = (err: Error | null) => {
        expect(err).toBeInstanceOf(Error);
        expect(err?.message).toBe('Not allowed by CORS');
        done();
      };

      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin(undefined, callback);
      }
    });
  });

  describe('corsOptions configuration', () => {
    it('should have credentials enabled', () => {
      expect(corsOptions.credentials).toBe(true);
    });

    it('should allow standard HTTP methods', () => {
      expect(corsOptions.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    });

    it('should allow Content-Type and Authorization headers', () => {
      expect(corsOptions.allowedHeaders).toEqual(['Content-Type', 'Authorization']);
    });

    it('should cache preflight requests for 24 hours', () => {
      expect(corsOptions.maxAge).toBe(86400);
    });
  });
});
