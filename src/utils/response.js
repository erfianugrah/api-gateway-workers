/**
 * Create a JSON response with standard headers
 * 
 * @param {Object} data - The data to serialize as JSON
 * @param {Object} options - Response options
 * @param {number} options.status - HTTP status code (default: 200)
 * @param {Object} options.headers - Additional headers to include
 * @returns {Response} The formatted response
 */
export function jsonResponse(data, { status = 200, headers = {} } = {}) {
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    ...headers
  };

  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders
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
    ...additionalData 
  }, { status });
}

/**
 * Create a not found response
 * 
 * @param {string} message - The error message (default: "Not Found")
 * @returns {Response} The not found response
 */
export function notFoundResponse(message = 'Not Found') {
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
    'Rate limit exceeded. Please try again later.',
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
  return errorResponse(
    'Method Not Allowed',
    405,
    {},
    { 'Allow': allowedMethods.join(', ') }
  );
}

/**
 * Create a CORS preflight response
 * 
 * @returns {Response} The preflight response
 */
export function preflightResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400', // 24 hours
    }
  });
}