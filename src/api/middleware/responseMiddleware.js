/**
 * Response middleware factory for adding headers
 *
 * @param {Object} options - Header options
 * @returns {Function} Middleware function
 */
export function createResponseMiddleware(options = {}) {
  const config = options.config;
  
  // Default CORS settings from config if available
  const defaultCors = {
    allowOrigin: config ? config.get('security.cors.allowOrigin', '*') : '*',
    allowMethods: config ? config.get('security.cors.allowMethods', 'GET, POST, PUT, DELETE, OPTIONS') : 'GET, POST, PUT, DELETE, OPTIONS',
    allowHeaders: config ? config.get('security.cors.allowHeaders', 'Content-Type, Authorization, X-API-Key') : 'Content-Type, Authorization, X-API-Key',
  };
  
  // Default security settings from config if available
  const defaultSecurity = {
    contentSecurityPolicy: config ? config.get('security.headers.contentSecurityPolicy', "default-src 'self'") : "default-src 'self'",
    xFrameOptions: config ? config.get('security.headers.xFrameOptions', 'DENY') : 'DENY',
    xContentTypeOptions: config ? config.get('security.headers.xContentTypeOptions', 'nosniff') : 'nosniff',
  };
  
  const {
    cors = defaultCors,
    security = defaultSecurity,
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
