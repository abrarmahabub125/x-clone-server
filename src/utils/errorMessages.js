/**
 * Standardized error messages for better UX
 * Use these messages to provide consistent, user-friendly error responses
 */

export const errorMessages = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: "Email or password is incorrect. Please try again.",
  USER_NOT_FOUND: "No account found with this email. Please sign up.",
  TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  UNAUTHORIZED: "Please log in to continue.",
  FORBIDDEN: "You don't have permission to access this resource.",

  // Validation & Input
  VALIDATION_ERROR: "Please check your input and try again.",
  INVALID_EMAIL: "Please enter a valid email address.",
  INVALID_PASSWORD:
    "Password must be 8-20 characters with uppercase, lowercase, number, and special character.",
  INVALID_USERNAME:
    "Username can only contain lowercase letters, numbers, and underscores.",
  INVALID_URL: "Please provide a valid URL.",

  // User Data
  EMAIL_EXISTS:
    "This email is already registered. Please try another or log in.",
  USERNAME_EXISTS: "This username is already taken. Please try another.",
  DUPLICATE_RESOURCE:
    "This record already exists. Please try different values.",

  // Post/Tweet Operations
  POST_NOT_FOUND: "The post you're looking for doesn't exist.",
  POST_DELETE_FAILED: "Unable to delete this post. Please try again.",
  POST_NOT_EMPTY: "Your post needs text or an image to be published.",

  // Follow/Unfollow
  ALREADY_FOLLOWING: "You're already following this user.",
  NOT_FOLLOWING: "You're not following this user.",
  CANNOT_FOLLOW_SELF: "You cannot follow yourself.",

  // Bookmark Operations
  ALREADY_BOOKMARKED: "You've already bookmarked this post.",
  NOT_BOOKMARKED: "You haven't bookmarked this post.",

  // Account Settings
  CURRENT_PASSWORD_INCORRECT: "Your current password is incorrect.",
  NEW_PASSWORD_SAME:
    "Your new password cannot be the same as your current password.",
  PASSWORD_MISMATCH: "Passwords do not match. Please try again.",

  // Server Errors
  INTERNAL_ERROR: "Something went wrong. Please try again later.",
  SERVICE_UNAVAILABLE:
    "The service is temporarily unavailable. Please try again later.",
  REQUEST_TIMEOUT: "The request took too long. Please try again.",

  // File Upload
  FILE_TOO_LARGE: "The file is too large. Please choose a smaller file.",
  INVALID_FILE_TYPE: "This file type is not supported. Please try another.",

  // Generic
  NOT_FOUND: "The resource you're looking for doesn't exist.",
  BAD_REQUEST: "The request is invalid. Please check your input.",
  CONFLICT:
    "This action conflicts with the current state. Please refresh and try again.",
};

/**
 * Get user-friendly message for a specific error type
 * @param {string} errorType - The error type/code
 * @param {object} context - Additional context for dynamic messages
 * @returns {string} - User-friendly error message
 */
export function getUserFriendlyMessage(errorType, context = {}) {
  if (errorMessages[errorType]) {
    return errorMessages[errorType];
  }

  // For specific field validation errors
  if (errorType === "FIELD_REQUIRED") {
    return `${context.field || "This field"} is required.`;
  }

  if (errorType === "FIELD_TOO_LONG") {
    return `${context.field || "This field"} cannot exceed ${context.max || "the limit"} characters.`;
  }

  if (errorType === "FIELD_TOO_SHORT") {
    return `${context.field || "This field"} must be at least ${context.min || "the minimum"} characters.`;
  }

  return errorMessages.INTERNAL_ERROR;
}

/**
 * Format validation errors into user-friendly messages
 * @param {array} validationErrors - Array of validation error objects
 * @returns {array} - Formatted error messages with field names
 */
export function formatValidationErrors(validationErrors = []) {
  return validationErrors.map((error) => ({
    field: error.field || "unknown",
    message: error.message || getUserFriendlyMessage("VALIDATION_ERROR"),
  }));
}
