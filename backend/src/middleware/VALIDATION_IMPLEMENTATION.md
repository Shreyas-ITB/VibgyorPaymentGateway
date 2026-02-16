# Input Validation and Sanitization Implementation

## Task 14.3 - Implementation Summary

This document describes the input validation and sanitization middleware implemented for the Vibgyor Payment Gateway backend.

## Features Implemented

### 1. XSS Prevention through Input Sanitization

**Files:**
- `backend/src/middleware/validation.ts`
- `backend/src/middleware/validation-schemas.ts`

**Functionality:**
- HTML tag removal from all user inputs
- Script tag sanitization to prevent XSS attacks
- Whitespace trimming
- Smart preservation of cryptographic values (signatures, order IDs, payment IDs)

**Protected Fields:**
The following fields preserve special characters as they contain cryptographic values:
- `signature`
- `orderId`
- `paymentId`
- `order_id`
- `payment_id`
- `webhookSignature`
- `x-razorpay-signature`
- `x-pinelabs-signature`

### 2. JSON Structure Validation

**Middleware Functions:**
- `validateJsonContentType`: Ensures Content-Type is application/json for POST/PUT/PATCH requests
- `validateJsonBody`: Validates that request body is a valid JSON object (not array or null)

### 3. Field Type and Schema Validation

**Validation Rules Supported:**
- Type checking (string, number, boolean, object, array)
- Required field validation
- Min/max constraints for numbers and string lengths
- Enum validation for specific allowed values
- Pattern matching with regex
- Nested object and array validation

**Schemas Defined:**
- `initiatePaymentSchema`: Validates payment initiation requests
  - planId: string (required, 1-100 chars)
  - amount: number (required, min: 1)
  - billingCycle: enum ['monthly', 'annual'] (required)

- `verifyPaymentSchema`: Validates payment verification requests
  - orderId: string (required, 1-200 chars)
  - paymentId: string (required, 1-200 chars)
  - signature: string (required, 1-500 chars)
  - provider: enum ['razorpay', 'pinelabs'] (required)
  - planId: string (required, 1-100 chars)
  - amount: number (required, min: 1)

### 4. Integration with Payment Controller

**Updated Endpoints:**
- `POST /api/payment/initiate`: Added validation middleware chain
- `POST /api/payment/verify`: Added validation middleware chain
- `POST /api/webhook/razorpay`: Added sanitization
- `POST /api/webhook/pinelabs`: Added sanitization

**Middleware Chain:**
```typescript
router.post('/endpoint',
  validateJsonContentType,  // 1. Check Content-Type header
  validateJsonBody,          // 2. Validate JSON structure
  sanitizeInput,             // 3. Sanitize all inputs
  validateSchema(schema),    // 4. Validate against schema
  async (req, res) => { ... }
);
```

### 5. Global Sanitization

Added global sanitization middleware in `backend/src/index.ts` to sanitize all incoming requests.

## Testing

### Unit Tests (`validation.test.ts`)
- 31 tests covering all validation and sanitization functions
- Tests for HTML removal, XSS prevention, type validation, enum validation
- Tests for edge cases (null, undefined, empty values)

### Property-Based Tests (`validation.property.test.ts`)
- 13 property tests using fast-check library
- 100 iterations per property test
- Tests universal properties:
  - Sanitized strings never contain HTML/script tags
  - Sanitization is idempotent
  - Alphanumeric characters are preserved
  - Object structure is preserved
  - Required fields always fail when missing
  - Type validation always rejects wrong types
  - Enum validation only accepts listed values
  - Min/max constraints are enforced

### Integration Tests (`validation-integration.test.ts`)
- 23 integration tests with PaymentController
- Tests validation middleware with real HTTP requests
- Tests XSS prevention with 10 different XSS payloads
- Tests error responses and status codes

**All 67 validation tests pass successfully.**

## Security Benefits

1. **XSS Prevention**: All user inputs are sanitized to remove malicious HTML and scripts
2. **Type Safety**: Strong type validation prevents type confusion attacks
3. **Input Validation**: Rejects malformed or invalid requests before processing
4. **Cryptographic Integrity**: Preserves special characters in signatures and IDs
5. **Defense in Depth**: Multiple layers of validation (content-type, structure, schema)

## Error Responses

All validation errors return a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed",
    "details": ["field1 is required", "field2 must be a number"]
  }
}
```

Error codes:
- `INVALID_CONTENT_TYPE`: Wrong Content-Type header
- `INVALID_JSON`: Malformed JSON body
- `INVALID_REQUEST`: Schema validation failed

## Dependencies Added

```json
{
  "dependencies": {
    "validator": "^13.11.0",
    "dompurify": "^3.0.8",
    "jsdom": "^23.0.1"
  },
  "devDependencies": {
    "@types/validator": "^13.11.7",
    "@types/dompurify": "^3.0.5",
    "@types/jsdom": "^21.1.6"
  }
}
```

## Usage Example

```typescript
import { validateSchema, sanitizeInput } from './middleware/validation';
import { initiatePaymentSchema } from './middleware/validation-schemas';

router.post('/api/payment/initiate',
  validateJsonContentType,
  validateJsonBody,
  sanitizeInput,
  validateSchema(initiatePaymentSchema),
  async (req, res) => {
    // req.body is now validated and sanitized
    const { planId, amount, billingCycle } = req.body;
    // ... process payment
  }
);
```

## Notes

- Sanitization is applied globally to all requests
- Cryptographic values (signatures, IDs) are preserved
- Validation happens before any business logic
- All validation is synchronous except for the final request handler
- Middleware is composable and reusable

## Compliance

This implementation satisfies **Requirement 1.4**:
> "IF the JSON data is malformed or missing required fields, THEN THE Payment_Gateway_Frontend SHALL display an error message and prevent further interaction"

The backend now validates all inputs and rejects malformed or invalid requests with appropriate error messages.
