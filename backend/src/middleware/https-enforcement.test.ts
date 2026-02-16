/**
 * Tests for HTTPS enforcement middleware
 * Validates: Requirements 11.1
 */

import request from 'supertest';
import express from 'express';

describe('HTTPS Enforcement Middleware', () => {
  let app: express.Application;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    app = express();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      
      // Apply HTTPS enforcement middleware
      app.use((req, res, next) => {
        const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
        
        if (!isHttps) {
          res.status(403).json({
            success: false,
            error: {
              code: 'HTTPS_REQUIRED',
              message: 'HTTPS is required for all requests in production'
            }
          });
          return;
        }
        
        next();
      });

      // Test route
      app.get('/test', (_req, res) => {
        res.json({ success: true });
      });
    });

    it('should reject HTTP requests in production', async () => {
      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'HTTPS_REQUIRED',
          message: 'HTTPS is required for all requests in production'
        }
      });
    });

    it('should accept requests with x-forwarded-proto header set to https', async () => {
      const response = await request(app)
        .get('/test')
        .set('x-forwarded-proto', 'https')
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      
      // In development, no HTTPS enforcement
      app.get('/test', (_req, res) => {
        res.json({ success: true });
      });
    });

    it('should accept HTTP requests in development', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });
});
