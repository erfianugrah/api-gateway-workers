/**
 * Base class for API errors with standardized response formatting
 */
export class ApiError extends Error {
  /**
   * Create a new API error
   *
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Error code for API clients
   */
  constructor(message, statusCode = 400, errorCode = "BAD_REQUEST") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }

  /**
   * Convert error to response object
   *
   * @returns {Object} Response object
   */
  toResponse() {
    return {
      error: this.message,
      code: this.errorCode,
      status: this.statusCode,
    };
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends ApiError {
  /**
   * Create a new validation error
   *
   * @param {string} message - Error message
   * @param {Object} details - Validation error details
   */
  constructor(message, details) {
    super(message, 400, "VALIDATION_ERROR");
    this.details = details;
  }

  /**
   * Convert error to response object with validation details
   *
   * @returns {Object} Response object with validation details
   */
  toResponse() {
    return {
      ...super.toResponse(),
      validationErrors: this.details,
    };
  }
}

/**
 * Error for resource not found
 */
export class NotFoundError extends ApiError {
  /**
   * Create a new not found error
   *
   * @param {string} resource - Resource type
   * @param {string} id - Resource ID
   */
  constructor(resource, id) {
    super(`${resource} not found: ${id}`, 404, "NOT_FOUND");
    this.resource = resource;
    this.resourceId = id;
  }
}

/**
 * Error for unauthorized access
 */
export class UnauthorizedError extends ApiError {
  /**
   * Create a new unauthorized error
   *
   * @param {string} message - Error message
   */
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/**
 * Error for forbidden access
 */
export class ForbiddenError extends ApiError {
  /**
   * Create a new forbidden error
   *
   * @param {string} message - Error message
   * @param {string} permission - Required permission
   */
  constructor(message = "Insufficient permissions", permission = null) {
    super(message, 403, "FORBIDDEN");
    this.requiredPermission = permission;
  }

  /**
   * Convert error to response object with permission info
   *
   * @returns {Object} Response object with permission info
   */
  toResponse() {
    const response = super.toResponse();

    if (this.requiredPermission) {
      response.requiredPermission = this.requiredPermission;
    }

    return response;
  }
}

/**
 * Error for rate limiting
 */
export class RateLimitError extends ApiError {
  /**
   * Create a new rate limit error
   *
   * @param {number} retryAfter - Seconds until retry is allowed
   */
  constructor(retryAfter) {
    super(
      "Rate limit exceeded. Please try again later.",
      429,
      "RATE_LIMIT_EXCEEDED"
    );
    this.retryAfter = retryAfter;
  }

  /**
   * Convert error to response object with retry info
   *
   * @returns {Object} Response object with retry info
   */
  toResponse() {
    return {
      ...super.toResponse(),
      retryAfter: this.retryAfter,
    };
  }
}
