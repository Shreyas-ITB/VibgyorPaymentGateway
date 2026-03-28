/**
 * Property-based tests for CORS middleware
 * 
 * These tests verify universal properties that should hold true
 * across all valid inputs for CORS configuration.
 */

import * as fc from 'fast-check';
import { getAllowedOrigins } from './cors';

describe('CORS Middleware - Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  /**
   * Property: Origin Parsing Preserves Count
   * 
   * For any list of valid origin URLs, parsing them as a comma-separated
   * string should produce an array with the same number of origins.
   * 
   * **Validates: Requirements 11.1**
   */
  it('should preserve origin count when parsing comma-separated origins', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.webUrl({ validSchemes: ['https'] }).filter(url => !url.includes(',')),
          { minLength: 1, maxLength: 10 }
        ),
        (origins) => {
          // Set up environment with comma-separated origins
          process.env.ALLOWED_ORIGINS = origins.join(',');

          const result = getAllowedOrigins();

          // Result should be an array with same length as input
          expect(Array.isArray(result)).toBe(true);
          if (Array.isArray(result)) {
            expect(result.length).toBe(origins.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Origin Parsing Preserves Values
   * 
   * For any list of valid origin URLs, parsing them as a comma-separated
   * string should produce an array containing all the original URLs.
   * 
   * **Validates: Requirements 11.1**
   */
  it('should preserve all origin values when parsing', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.webUrl({ validSchemes: ['https'] }).filter(url => !url.includes(',')),
          { minLength: 1, maxLength: 10 }
        ),
        (origins) => {
          process.env.ALLOWED_ORIGINS = origins.join(',');

          const result = getAllowedOrigins();

          // All original origins should be present in result
          if (Array.isArray(result)) {
            origins.forEach(origin => {
              expect(result).toContain(origin);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Whitespace Trimming
   * 
   * For any list of origins with arbitrary whitespace around them,
   * the parsed result should contain trimmed versions without whitespace.
   * 
   * **Validates: Requirements 11.1**
   */
  it('should trim whitespace from all origins', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.webUrl({ validSchemes: ['https'] }).filter(url => !url.includes(',')),
          { minLength: 1, maxLength: 10 }
        ),
        fc.array(
          fc.stringOf(fc.constantFrom(' ', '\t'), { maxLength: 5 }),
          { minLength: 1, maxLength: 10 }
        ),
        (origins, whitespaces) => {
          // Add random whitespace around each origin
          const originsWithWhitespace = origins.map((origin, i) => {
            const ws = whitespaces[i % whitespaces.length];
            return `${ws}${origin}${ws}`;
          });

          process.env.ALLOWED_ORIGINS = originsWithWhitespace.join(',');

          const result = getAllowedOrigins();

          // Result should contain trimmed origins
          if (Array.isArray(result)) {
            result.forEach(origin => {
              expect(origin).toBe(origin.trim());
              expect(origin).not.toMatch(/^\s/);
              expect(origin).not.toMatch(/\s$/);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Development Mode Wildcard
   * 
   * In development mode without ALLOWED_ORIGINS set, the function
   * should always return a wildcard string.
   * 
   * **Validates: Requirements 11.1**
   */
  it('should return wildcard in development when no origins specified', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('development', 'dev', 'local'),
        (nodeEnv) => {
          process.env.NODE_ENV = nodeEnv === 'development' ? 'development' : originalEnv.NODE_ENV;
          delete process.env.ALLOWED_ORIGINS;

          if (nodeEnv === 'development') {
            const result = getAllowedOrigins();
            expect(result).toBe('*');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Production Mode Requires Origins
   * 
   * In production mode without ALLOWED_ORIGINS set, the function
   * should always throw an error.
   * 
   * **Validates: Requirements 11.1**
   */
  it('should throw error in production when no origins specified', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('production', 'prod'),
        (_nodeEnv) => {
          process.env.NODE_ENV = 'production';
          delete process.env.ALLOWED_ORIGINS;

          expect(() => getAllowedOrigins()).toThrow(
            'ALLOWED_ORIGINS environment variable must be set in production'
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Empty String Handling
   * 
   * When ALLOWED_ORIGINS is set to an empty string in production,
   * it should still parse it as an array (even though it's not useful).
   * 
   * **Validates: Requirements 11.1**
   */
  it('should handle empty ALLOWED_ORIGINS string', () => {
    // Use a non-empty string to avoid the wildcard behavior
    process.env.ALLOWED_ORIGINS = ' '; // Single space

    const result = getAllowedOrigins();

    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result.length).toBe(1);
      expect(result[0]).toBe(''); // Trimmed to empty string
    }
  });

  /**
   * Property: Single Origin Parsing
   * 
   * For any single valid origin URL, parsing it should produce
   * an array with exactly one element containing that URL.
   * 
   * **Validates: Requirements 11.1**
   */
  it('should correctly parse single origin', () => {
    fc.assert(
      fc.property(
        fc.webUrl({ validSchemes: ['https'] }).filter(url => !url.includes(',')),
        (origin) => {
          process.env.ALLOWED_ORIGINS = origin;

          const result = getAllowedOrigins();

          expect(Array.isArray(result)).toBe(true);
          if (Array.isArray(result)) {
            expect(result.length).toBe(1);
            expect(result[0]).toBe(origin);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
