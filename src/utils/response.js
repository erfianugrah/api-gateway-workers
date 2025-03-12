/**
 * Create a JSON response with standard headers
 *
 * @param {Object} data - The data to serialize as JSON
 * @param {Object} options - Response options
 * @param {number} options.status - HTTP status code (default: 200)
 * @param {Object} options.headers - Additional headers to include
 * @param {Object} options.config - Optional configuration instance
 * @returns {Response} The formatted response
 */
export function jsonResponse(data, { status = 200, headers = {}, config = null } = {}) {
  // Get CORS values from config if available
  const allowOrigin = config ? config.get("security.cors.allowOrigin", "*") : "*";
  const allowMethods = config ? config.get("security.cors.allowMethods", "GET, POST, PUT, DELETE, OPTIONS") : "GET, POST, PUT, DELETE, OPTIONS";
  const allowHeaders = config ? config.get("security.cors.allowHeaders", "Content-Type, Authorization, X-API-Key") : "Content-Type, Authorization, X-API-Key";

  const responseHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": allowMethods,
    "Access-Control-Allow-Headers": allowHeaders,
    ...headers,
  };

  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });
}

/**
 * Create a successful response
 *
 * @param {Object} data - The data to include in the response
 * @param {Object} options - Additional response options
 * @returns {Response} The success response
 */
export function successResponse(data, options = {}) {
  return jsonResponse(data, { status: 200, ...options });
}

/**
 * Create a created response (HTTP 201)
 *
 * @param {Object} data - The data to include in the response
 * @param {Object} options - Additional response options
 * @returns {Response} The created response
 */
export function createdResponse(data, options = {}) {
  return jsonResponse(data, { status: 201, ...options });
}

/**
 * Create an error response
 *
 * @param {string} message - The error message
 * @param {number} status - HTTP status code (default: 400)
 * @param {Object} additionalData - Additional data to include in the response
 * @returns {Response} The error response
 */
export function errorResponse(message, status = 400, additionalData = {}) {
  return jsonResponse({
    error: message,
    ...additionalData,
  }, { status });
}

/**
 * Create a not found response
 *
 * @param {string} message - The error message (default: "Not Found")
 * @returns {Response} The not found response
 */
export function notFoundResponse(message = "Not Found") {
  return errorResponse(message, 404);
}

/**
 * Create a validation error response
 *
 * @param {string} message - The validation error message
 * @param {Object} details - Additional validation error details
 * @returns {Response} The validation error response
 */
export function validationErrorResponse(message, details = {}) {
  return errorResponse(message, 400, { validationErrors: details });
}

/**
 * Create a rate limit exceeded response
 *
 * @param {number} retryAfter - Seconds until the client can retry
 * @returns {Response} The rate limit response
 */
export function rateLimitResponse(retryAfter) {
  return errorResponse(
    "Rate limit exceeded. Please try again later.",
    429,
    { retryAfter }
  );
}

/**
 * Create a method not allowed response
 *
 * @param {string[]} allowedMethods - List of allowed HTTP methods
 * @returns {Response} The method not allowed response
 */
export function methodNotAllowedResponse(allowedMethods) {
  return jsonResponse({
    error: "Method Not Allowed",
  }, {
    status: 405,
    headers: { "Allow": allowedMethods.join(", ") },
  });
}

/**
 * Create a CORS preflight response
 *
 * @param {Object} config - Optional configuration instance
 * @returns {Response} The preflight response
 */
export function preflightResponse(config = null) {
  const allowOrigin = config ? config.get("security.cors.allowOrigin", "*") : "*";
  const allowMethods = config ? config.get("security.cors.allowMethods", "GET, POST, PUT, DELETE, OPTIONS") : "GET, POST, PUT, DELETE, OPTIONS";
  const allowHeaders = config ? config.get("security.cors.allowHeaders", "Content-Type, Authorization, X-API-Key") : "Content-Type, Authorization, X-API-Key";
  const maxAge = config ? config.get("security.cors.maxAge", 86400) : 86400; // 24 hours

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": allowMethods,
      "Access-Control-Allow-Headers": allowHeaders,
      "Access-Control-Max-Age": maxAge.toString(),
    },
  });
}
