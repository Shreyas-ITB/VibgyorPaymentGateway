/**
 * Integration tests for CORS middleware with Express
 */

import request from 'supertest';
import express from 'express';
import { corsMiddleware } from './cors';

describe('CORS Middleware Integration', () => {
  const originalEnv = process.env;
  let app: express.Application;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };

    // Create a fresh Express app for each test
    app = express();
    app.use(corsMiddleware);
    app.get('/test', (_req, res) => {
      res.json({ message: 'success' });
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Allowed Origins', () => {
    it('should allow requests from allowed origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
    });

    it('should allow requests from multiple allowed origins', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';

      const response1 = await request(app)
        .get('/test')
        .set('Origin', 'https://example.com');

      expect(response1.status).toBe(200);
      expect(response1.headers['access-control-allow-origin']).toBe('https://example.com');

      const response2 = await request(app)
        .get('/test')
        .set('Origin', 'https://app.example.com');

      expect(response2.status).toBe(200);
      expect(response2.headers['access-control-allow-origin']).toBe('https://app.example.com');
    });

    it('should reject requests from unauthorized origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://malicious.com');

      // CORS middleware will not set the allow-origin header for unauthorized origins
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Development Mode', () => {
    it('should allow all origins in development mode', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://any-domain.com');

      expect(response.status).toBe(200);
      // CORS reflects the origin back when allowed, not the wildcard
      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });

    it('should allow requests without origin in development', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
    });
  });

  describe('CORS Headers', () => {
    it('should include credentials header', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://example.com');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle preflight OPTIONS requests', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should allow specified headers', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });

    it('should set max-age for preflight caching', async () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com';

      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-max-age']).toBe('86400');
    });
  });

  describe('Security', () => {
    it('should not expose backend to unauthorized domains', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://trusted.com';

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://attacker.com');

      // Response should not include CORS headers for unauthorized origin
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle production mode with allowed origins set', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://trusted.com';

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://trusted.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://trusted.com');
    });
  });
});
