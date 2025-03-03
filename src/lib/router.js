import { 
  preflightResponse, 
  errorResponse, 
  methodNotAllowedResponse, 
  rateLimitResponse 
} from '../utils/response.js';
import { getRateLimitStorageId } from '../utils/storage.js';
import { getClientIp } from '../utils/security.js';
import { checkRateLimit } from '../utils/security.js';

/**
 * Route handler definition
 * @typedef {Object} RouteHandler
 * @property {string} path - URL path pattern to match
 * @property {string} method - HTTP method to match
 * @property {Function} handler - Function to handle the request
 */

/**
 * Router for handling HTTP requests
 */
export class Router {
  /**
   * Create a new router
   */
  constructor() {
    this.routes = [];
  }

  /**
   * Add a route handler
   *
   * @param {string} method - HTTP method to match
   * @param {string} path - URL path pattern to match
   * @param {Function} handler - Function to handle the request
   * @returns {Router} The router instance for chaining
   */
  add(method, path, handler) {
    this.routes.push({ method, path, handler });
    return this;
  }

  /**
   * Find a matching route for a request
   *
   * @param {string} method - HTTP method to match
   * @param {string} path - URL path to match
   * @returns {Object|null} The matched route or null
   */
  findRoute(method, path) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      
      // Exact path match
      if (route.path === path) {
        return { ...route, params: {} };
      }
      
      // Path with parameter
      if (route.path.includes(':')) {
        const routeParts = route.path.split('/');
        const pathParts = path.split('/');
        
        if (routeParts.length !== pathParts.length) continue;
        
        const params = {};
        let match = true;
        
        for (let i = 0; i < routeParts.length; i++) {
          if (routeParts[i].startsWith(':')) {
            // Extract parameter
            const paramName = routeParts[i].substring(1);
            params[paramName] = pathParts[i];
          } else if (routeParts[i] !== pathParts[i]) {
            match = false;
            break;
          }
        }
        
        if (match) {
          return { ...route, params };
        }
      }
    }
    
    return null;
  }

  /**
   * Handle an HTTP request
   *
   * @param {Request} request - The HTTP request
   * @param {Object} context - Request context with dependencies
   * @returns {Promise<Response>} The HTTP response
   */
  async handle(request, context) {
    // Get request details
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // Handle preflight requests
    if (method === 'OPTIONS') {
      return preflightResponse();
    }
    
    // Check rate limits
    const clientIp = getClientIp(request);
    const rateLimitKey = getRateLimitStorageId(clientIp, path);
    const rateLimit = await checkRateLimit(
      context.storage,
      rateLimitKey,
      100, // 100 requests per minute
      60000 // 1 minute window
    );
    
    if (rateLimit.limited) {
      return rateLimitResponse(rateLimit.retryAfter);
    }
    
    // Add rate limit headers to all responses
    context.rateLimit = {
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimit.reset / 1000).toString()
    };
    
    // Request validation for POST and PUT
    if ((method === 'POST' || method === 'PUT') && request.body) {
      // Verify content type
      const contentType = request.headers.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        return errorResponse('Content-Type must be application/json', 415);
      }
      
      // Check for reasonable body size
      const contentLength = request.headers.get('Content-Length');
      if (contentLength && parseInt(contentLength) > 1024 * 100) { // 100KB limit
        return errorResponse('Request body too large', 413);
      }
    }
    
    // Find route handler
    const route = this.findRoute(method, path);
    
    if (!route) {
      // Check if path exists but method not allowed
      const allowedMethods = this.routes
        .filter(r => r.path === path || this.pathMatchesWithParams(r.path, path))
        .map(r => r.method);
      
      if (allowedMethods.length > 0) {
        return methodNotAllowedResponse(allowedMethods);
      }
      
      return errorResponse('Not Found', 404);
    }
    
    try {
      // Execute route handler with route params
      return await route.handler(request, { ...context, params: route.params });
    } catch (error) {
      console.error(`Error handling route ${method} ${path}:`, error);
      return errorResponse(
        'An unexpected error occurred. Please try again or contact support.',
        500
      );
    }
  }
  
  /**
   * Check if a parameterized path pattern matches a concrete path
   *
   * @param {string} pattern - Path pattern with parameters
   * @param {string} path - Concrete path to match
   * @returns {boolean} Whether the pattern matches the path
   */
  pathMatchesWithParams(pattern, path) {
    if (!pattern.includes(':')) return false;
    
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    
    if (patternParts.length !== pathParts.length) return false;
    
    for (let i = 0; i < patternParts.length; i++) {
      if (!patternParts[i].startsWith(':') && patternParts[i] !== pathParts[i]) {
        return false;
      }
    }
    
    return true;
  }
}