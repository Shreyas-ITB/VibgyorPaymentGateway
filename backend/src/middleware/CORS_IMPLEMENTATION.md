# CORS Implementation

## Overview

This document describes the CORS (Cross-Origin Resource Sharing) middleware implementation for the Vibgyor Payment Gateway backend. The CORS configuration restricts API access to authorized frontend domains only, ensuring secure payment data handling.

## Implementation

### Files

- **`cors.ts`**: Main CORS middleware implementation
- **`cors.test.ts`**: Unit tests for CORS functionality
- **`cors.property.test.ts`**: Property-based tests for CORS configuration
- **`cors.integration.test.ts`**: Integration tests with Express

### Features

1. **Environment-based Configuration**: CORS origins are configured via the `ALLOWED_ORIGINS` environment variable
2. **Development Mode**: Allows all origins (`*`) when `ALLOWED_ORIGINS` is not set in development
3. **Production Mode**: Requires explicit `ALLOWED_ORIGINS` configuration; throws error if not set
4. **Multiple Origins**: Supports comma-separated list of allowed origins
5. **Whitespace Handling**: Automatically trims whitespace from origin URLs
6. **Credentials Support**: Enables credentials (cookies, authorization headers)
7. **Preflight Caching**: Caches preflight requests for 24 hours

## Configuration

### Environment Variables

```bash
# Development (optional - defaults to '*' if not set)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4200

# Production (required)
ALLOWED_ORIGINS=https://example.com,https://app.example.com,https://admin.example.com
```

### CORS Options

The middleware is configured with the following options:

- **origin**: Dynamic origin validation based on `ALLOWED_ORIGINS`
- **credentials**: `true` - Allows cookies and authorization headers
- **methods**: `['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']`
- **allowedHeaders**: `['Content-Type', 'Authorization']`
- **maxAge**: `86400` (24 hours) - Caches preflight requests

## Usage

The CORS middleware is automatically applied to all routes in the Express application:

```typescript
import { corsMiddleware } from './middleware';

app.use(corsMiddleware);
```

## Security

### Origin Validation

The middleware validates the `Origin` header of incoming requests:

1. **Allowed Origins**: Requests from origins in the `ALLOWED_ORIGINS` list are accepted
2. **Unauthorized Origins**: Requests from other origins are rejected (no CORS headers set)
3. **No Origin**: In development, requests without an origin are allowed; in production with explicit origins, they are rejected

### Production Requirements

In production mode, the middleware enforces strict security:

- `ALLOWED_ORIGINS` must be explicitly set
- Only HTTPS origins should be configured
- Wildcard (`*`) is not allowed in production

## Testing

### Test Coverage

- **Unit Tests**: 18 tests covering configuration parsing and validation
- **Property-Based Tests**: 8 tests with 100+ iterations each, validating universal properties
- **Integration Tests**: 6 tests verifying CORS behavior with Express

### Running Tests

```bash
# Run all CORS tests
npm test -- cors

# Run specific test file
npm test -- cors.test.ts
npm test -- cors.property.test.ts
npm test -- cors.integration.test.ts
```

### Test Results

All 32 CORS tests pass successfully:

```
PASS  src/middleware/cors.test.ts
PASS  src/middleware/cors.integration.test.ts
PASS  src/middleware/cors.property.test.ts

Test Suites: 3 passed, 3 total
Tests:       32 passed, 32 total
```

## Requirements Validation

This implementation validates **Requirement 11.1** from the design document:

> **11.1**: THE Payment_Gateway_Backend SHALL communicate with Payment_Providers using HTTPS only

The CORS middleware ensures that:

1. Only authorized frontend domains can access the backend API
2. API access is restricted to prevent unauthorized cross-origin requests
3. Credentials (cookies, authorization headers) are properly handled
4. Production deployments require explicit origin configuration

## Examples

### Development Setup

```bash
# .env file
NODE_ENV=development
# ALLOWED_ORIGINS not set - allows all origins
```

### Production Setup

```bash
# .env file
NODE_ENV=production
ALLOWED_ORIGINS=https://payment.example.com,https://app.example.com
```

### Multiple Environments

```bash
# Staging
ALLOWED_ORIGINS=https://staging.example.com,https://staging-app.example.com

# Production
ALLOWED_ORIGINS=https://example.com,https://app.example.com,https://admin.example.com
```

## Error Handling

### Configuration Errors

If `ALLOWED_ORIGINS` is not set in production, the application will throw an error:

```
Error: ALLOWED_ORIGINS environment variable must be set in production
```

### Unauthorized Origin Requests

Requests from unauthorized origins will not receive CORS headers, causing the browser to block the response:

```
Access to fetch at 'https://api.example.com/api/payment/initiate' from origin 'https://malicious.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Maintenance

### Adding New Origins

To add a new authorized origin:

1. Update the `ALLOWED_ORIGINS` environment variable
2. Restart the backend server
3. Verify the new origin can access the API

### Removing Origins

To remove an origin:

1. Remove it from the `ALLOWED_ORIGINS` environment variable
2. Restart the backend server
3. Verify the removed origin can no longer access the API

## Best Practices

1. **Use HTTPS**: Always use HTTPS origins in production
2. **Minimize Origins**: Only add origins that need API access
3. **Regular Audits**: Periodically review and update the allowed origins list
4. **Environment-Specific**: Use different origins for development, staging, and production
5. **No Wildcards in Production**: Never use `*` in production environments
