/**
 * Enhanced HTTP router with middleware support
 */
export class Router {
  /**
   * Create a new router
   */
  constructor() {
    this.routes = [];
    this.globalMiddleware = [];
  }

  /**
   * Add a global middleware to be executed for all routes
   *
   * @param {Function} middleware - Middleware function
   * @returns {Router} The router instance for chaining
   */
  use(middleware) {
    this.globalMiddleware.push(middleware);
    return this;
  }

  /**
   * Add a route handler
   *
   * @param {string} method - HTTP method to match
   * @param {string} path - URL path pattern to match
   * @param {...Function} handlers - Handler functions (last one is the main handler, others are middleware)
   * @returns {Router} The router instance for chaining
   */
  add(method, path, ...handlers) {
    const mainHandler = handlers.pop();
    const middleware = handlers;

    this.routes.push({
      method,
      path,
      handler: mainHandler,
      middleware,
    });

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
      if (route.path.includes(":")) {
        const routeParts = route.path.split("/");
        const pathParts = path.split("/");

        if (routeParts.length !== pathParts.length) continue;

        const params = {};
        let match = true;

        for (let i = 0; i < routeParts.length; i++) {
          if (routeParts[i].startsWith(":")) {
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
   * Check if a parameterized path pattern matches a concrete path
   *
   * @param {string} pattern - Path pattern with parameters
   * @param {string} path - Concrete path to match
   * @returns {boolean} Whether the pattern matches the path
   */
  pathMatchesWithParams(pattern, path) {
    if (!pattern.includes(":")) return false;

    const patternParts = pattern.split("/");
    const pathParts = path.split("/");

    if (patternParts.length !== pathParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (
        !patternParts[i].startsWith(":") && patternParts[i] !== pathParts[i]
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle an HTTP request
   *
   * @param {Request} request - The HTTP request
   * @param {Object} context - Request context with dependencies
   * @returns {Promise<Response>} The HTTP response
   */
  async handle(request, context) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Store original request for tracking
    const originalRequest = request;

    try {
      // Apply global middleware first
      let currentRequest = request;
      for (const middleware of this.globalMiddleware) {
        currentRequest = await middleware(currentRequest, context);
      }

      // Find route handler
      const route = this.findRoute(method, path);

      if (!route) {
        // Check if path exists but method not allowed
        const allowedMethods = this.routes
          .filter((r) =>
            r.path === path || this.pathMatchesWithParams(r.path, path)
          )
          .map((r) => r.method);

        if (allowedMethods.length > 0) {
          return this.methodNotAllowedResponse(allowedMethods);
        }

        return this.notFoundResponse();
      }

      // Apply route-specific middleware
      for (const middleware of route.middleware) {
        currentRequest = await middleware(currentRequest, context);
      }

      // Execute route handler with route params
      return await route.handler(currentRequest, {
        ...context,
        params: route.params,
      });
    } catch (error) {
      return this.errorResponse(error, originalRequest);
    }
  }

  /**
   * Create a not found response
   *
   * @returns {Response} 404 response
   */
  notFoundResponse() {
    return new Response(
      JSON.stringify({ error: "Not Found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  /**
   * Create a method not allowed response
   *
   * @param {string[]} allowedMethods - Allowed HTTP methods
   * @returns {Response} 405 response
   */
  methodNotAllowedResponse(allowedMethods) {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Allow": allowedMethods.join(", "),
        },
      },
    );
  }

  /**
   * Create an error response
   *
   * @param {Error} error - The error
   * @param {Request} request - Original request
   * @returns {Response} Error response
   */
  errorResponse(error, request) {
    console.error("Router error:", error);

    // Try to get error handler from context
    const { errorHandler } = require("../../api/middleware/errorHandler.js");
    if (errorHandler) {
      return errorHandler(error, request);
    }

    // Basic error handling if errorHandler not available
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
