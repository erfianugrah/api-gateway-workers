import { preflightResponse } from "../../utils/response.js";

/**
 * CORS middleware factory
 *
 * @param {Object} options - CORS options
 * @returns {Function} Middleware function
 */
export function createCorsMiddleware(options = {}) {
  const {
    allowOrigin = "*",
    allowMethods = "GET, POST, PUT, DELETE, OPTIONS",
    allowHeaders = "Content-Type, Authorization, X-API-Key",
    maxAge = 86400, // 24 hours
  } = options;

  return async (request) => {
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return preflightResponse();
    }

    // For other requests, continue but modify response later
    // We'll add CORS headers in a response middleware
    return request;
  };
}
