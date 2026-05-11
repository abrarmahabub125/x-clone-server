# API Error Handling & Response Standards

## Overview

This document describes the improved error handling system for the X-Clone API. All errors now return user-friendly, consistent messages optimized for better UX.

## Response Structure

### Success Response

```json
{
  "success": true,
  "message": "Request completed successfully.",
  "data": { ... },
  "meta": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": {
    "code": "ERROR_CODE",
    "details": [ ... ]
  }
}
```

### Validation Error Response

```json
{
  "success": false,
  "message": "Please check your input and try again.",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Please enter a valid email address"
      },
      {
        "field": "password",
        "message": "Password must contain at least one uppercase letter"
      }
    ]
  }
}
```

## Error Codes Reference

### Authentication & Authorization (4xx)

- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Permission denied
- `VALIDATION_ERROR` (400) - Invalid input

### Resource Errors (4xx-5xx)

- `NOT_FOUND` (404) - Resource doesn't exist
- `DUPLICATE_RESOURCE` (409) - Resource already exists
- `CONFLICT` (409) - State conflict
- `BAD_REQUEST` (400) - Invalid request format

### Server Errors (5xx)

- `INTERNAL_SERVER_ERROR` (500) - Unexpected server error
- `INVALID_JSON` (400) - Malformed JSON body

## Key Improvements Made

### 1. Validation Messages

All validation schemas now have clear, actionable error messages:

**Before:**

```
"Must contain at least one lowercase letter"
"Password is too long"
```

**After:**

```
"Password must contain at least one lowercase letter"
"Password cannot exceed 20 characters"
```

### 2. Duplicate Resource Errors

Now includes field context:

**Before:**

```
"A resource with the same value already exists."
```

**After:**

```
"A user with this email already exists. Please try another."
```

### 3. General Error Messages

All messages are now conversational and actionable:

**Before:**

```
"The request could not be processed."
"Authentication is required to access this resource."
```

**After:**

```
"Please check your input and try again."
"Please log in to continue."
```

## Usage Examples

### Throwing Custom Errors

```javascript
import { createAppError } from "../utils/apiError.js";

// Simple error
throw createAppError({
  statusCode: 404,
  code: "USER_NOT_FOUND",
  message: "No account found with this email. Please sign up.",
});

// With details (e.g., validation errors)
throw createAppError({
  statusCode: 400,
  code: "VALIDATION_ERROR",
  message: "Please check your input and try again.",
  details: [{ field: "email", message: "Please enter a valid email address" }],
});
```

### Using Error Messages Helper

```javascript
import {
  getUserFriendlyMessage,
  errorMessages,
} from "../utils/errorMessages.js";

// Direct access
const msg = errorMessages.EMAIL_EXISTS;

// Dynamic messages
const msg = getUserFriendlyMessage("FIELD_TOO_LONG", {
  field: "Biography",
  max: 160,
});
```

## Field-Level Validation Error Details

When validation fails, the `details` array includes:

```json
{
  "field": "fieldName",
  "message": "User-friendly message for this specific field"
}
```

This allows frontend to:

1. Display field-specific errors next to input fields
2. Show all errors together
3. Highlight specific fields with errors

## Best Practices

1. **Always use meaningful error messages** - Avoid technical jargon
2. **Be specific** - Tell users what went wrong and how to fix it
3. **Include field context** - Specify which field has the error
4. **Use consistent tone** - Friendly, helpful, non-judgmental
5. **Provide actionable guidance** - Help users understand next steps

## Validation Schema Standards

All validation schemas now follow this pattern:

```javascript
const userSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(20, "Password cannot exceed 20 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
});
```

### Message Format

- **Minimum/Maximum**: `"[Field] must be at least X characters" / "cannot exceed X"`
- **Format/Pattern**: `"[Field] must contain [requirement]"`
- **Required**: `"[Field] is required"`
- **Custom**: `"[Descriptive instruction]"`

## Error Handler Middleware

The error handler automatically:

1. Catches unhandled errors
2. Extracts error details
3. Formats validation errors
4. Returns consistent error responses
5. Logs errors for debugging

No additional error handling code needed in routes!

## Testing Error Responses

Use these test cases to verify error messages:

```bash
# Validation Error
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"weak"}'

# Duplicate Resource
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","email":"existing@test.com","password":"Password123!"}'

# Not Found
curl http://localhost:3000/tweets/invalidId

# Invalid JSON
curl -X POST http://localhost:3000/tweets \
  -H "Content-Type: application/json" \
  -d '{invalid json}'
```

---

**Last Updated:** May 2025
