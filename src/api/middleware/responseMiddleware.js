/**
 * Response middleware factory for adding headers
 *
 * @param {Object} options - Header options
 * @returns {Function} Middleware function
 */
export function createResponseMiddleware(options = {}) {
  const {
    cors = {
      allowOrigin: "*",
      allowMethods: "GET, POST, PUT, DELETE, OPTIONS",
      allowHeaders: "Content-Type, Authorization, X-API-Key",
    },
    security = {
      contentSecurityPolicy: "default-src 'self'",
      xFrameOptions: "DENY",
      xContentTypeOptions: "nosniff",
    },
  } = options;

  return async (response) => {
    // Create a new response with added headers
    const headers = new Headers(response.headers);

    // Add CORS headers
    headers.set("Access-Control-Allow-Origin", cors.allowOrigin);
    headers.set("Access-Control-Allow-Methods", cors.allowMethods);
    headers.set("Access-Control-Allow-Headers", cors.allowHeaders);

    // Add security headers
    headers.set("Content-Security-Policy", security.contentSecurityPolicy);
    headers.set("X-Frame-Options", security.xFrameOptions);
    headers.set("X-Content-Type-Options", security.xContentTypeOptions);

    // Return new response with added headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
