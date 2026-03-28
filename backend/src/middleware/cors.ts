/**
 * CORS Configuration Middleware
 * 
 * Configures Cross-Origin Resource Sharing (CORS) to restrict API access
 * to authorized frontend domains only.
 * 
 * Validates: Requirements 11.1 - Secure Payment Data Handling
 */

import cors from 'cors';
import { CorsOptions } from 'cors';

/**
 * Get allowed origins from environment variable
 * 
 * @returns Array of allowed origin URLs or wildcard for development
 */
export function getAllowedOrigins(): string | string[] {
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  
  // In development, allow all origins if not specified
  if (!allowedOriginsEnv && process.env.NODE_ENV === 'development') {
    return '*';
  }
  
  // In production, require explicit origins
  if (!allowedOriginsEnv) {
    throw new Error('ALLOWED_ORIGINS environment variable must be set in production');
  }
  
  // Parse comma-separated origins
  return allowedOriginsEnv.split(',').map(origin => origin.trim());
}

/**
 * CORS configuration options
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests) in development
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // If wildcard is set, allow all origins
    if (allowedOrigins === '*') {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (origin && (allowedOrigins as string[]).includes(origin)) {
      return callback(null, true);
    }
    
    // Reject unauthorized origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight requests for 24 hours
};

/**
 * Configured CORS middleware
 */
export const corsMiddleware = cors(corsOptions);
