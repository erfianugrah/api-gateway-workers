/**
 * Enhanced HTTP router with middleware support
 */
export class Router {
  /**
   * Create a new router
   * 
   * @param {Config} [config] - Optional configuration instance
   */
  constructor(config = null) {
    this.routes = [];
    this.globalMiddleware = [];
    this.regexCache = new Map();
    this.config = config;
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
      isRegex: false
    });

    return this;
  }

  /**
   * Add a route handler with regex pattern
   *
   * @param {string} method - HTTP method to match
   * @param {RegExp} pattern - Regular expression pattern to match path
   * @param {...Function} handlers - Handler functions (last one is the main handler, others are middleware)
   * @returns {Router} The router instance for chaining
   */
  addRegex(method, pattern, ...handlers) {
    const mainHandler = handlers.pop();
    const middleware = handlers;

    if (!(pattern instanceof RegExp)) {
      throw new Error('Pattern must be a RegExp instance');
    }

    this.routes.push({
      method,
      path: pattern,
      handler: mainHandler,
      middleware,
      isRegex: true
    });

    return this;
  }
  
  /**
   * Add a route with pattern from config validation
   *
   * @param {string} method - HTTP method to match
   * @param {string} path - URL path pattern with :param placeholders
   * @param {string} paramType - Parameter type from config (id, date, status)
   * @param {string} paramName - Parameter name in the path
   * @param {...Function} handlers - Handler functions
   * @returns {Router} The router instance for chaining
   */
  addValidated(method, path, paramType, paramName, ...handlers) {
    if (!this.config) {
      throw new Error('Config instance required for validated routes');
    }
    
    // Get regex pattern from config
    const pattern = this.config.getRegexPattern(paramType);
    if (!pattern) {
      throw new Error(`No validation pattern found for '${paramType}'`);
    }
    
    // Convert path with :param to regex pattern
    // Replace :paramName with the regex pattern from config
    const pathRegexStr = path.replace(
      `:${paramName}`, 
      `(${pattern.source.slice(1, -1)})` // Remove ^ and $ from the pattern
    );
    
    // Create the full regex
    const pathRegex = new RegExp(`^${pathRegexStr}$`);
    
    // Add the route using addRegex
    return this.addRegex(method, pathRegex, ...handlers);
  }
  
  /**
   * Add a versioned API route
   *
   * @param {string} method - HTTP method to match
   * @param {string} path - URL path pattern without version prefix
   * @param {...Function} handlers - Handler functions
   * @returns {Router} The router instance for chaining
   */
  addVersioned(method, path, ...handlers) {
    if (!this.config) {
      throw new Error('Config instance required for versioned routes');
    }
    
    const versionInfo = this.config.getVersionInfo();
    if (!versionInfo.enabled) {
      // If versioning is disabled, just add the route normally
      return this.add(method, path, ...handlers);
    }
    
    // Add routes for all supported versions
    for (const version of versionInfo.supported) {
      // Use versioning format from config, or default to /v{version}
      const format = this.config.get('routing.versioning.format', '/v${version}');
      const versionedPath = format.replace('${version}', version) + path;
      this.add(method, versionedPath, ...handlers);
    }
    
    return this;
  }
  
  /**
   * Add a proxy route to forward requests to an upstream service
   * 
   * @param {string} path - URL path pattern to match
   * @param {string} serviceName - Name of the service to proxy to (must be registered in config)
   * @param {Object} options - Proxy options
   * @param {string} [options.stripPrefix] - Path prefix to remove before proxying
   * @param {Object} [options.headers] - Additional headers to add to proxied request
   * @returns {Router} The router instance for chaining
   */
  addProxy(path, serviceName, options = {}) {
    if (!this.config) {
      throw new Error('Config instance required for proxy routes');
    }
    
    // Get the proxy service
    const proxyConfig = this.config.getProxyConfig();
    if (!proxyConfig.enabled) {
      console.warn(`Proxy functionality is disabled, but route ${path} is configured to proxy to ${serviceName}`);
    }
    
    // Verify the service exists
    const services = proxyConfig.services || {};
    if (!services[serviceName]) {
      throw new Error(`Unknown proxy service: ${serviceName}`);
    }
    
    // Define the proxy handler function
    const proxyHandler = async (request, context) => {
      // Get the proxy service from the context
      const proxyService = context.proxyService;
      if (!proxyService) {
        return new Response(
          JSON.stringify({ error: 'Proxy service not available' }),
          { status: 500, headers: { 'Content-Type': 'application/json' }}
        );
      }
      
      // Get the path to proxy
      let proxyPath = new URL(request.url).pathname;
      
      // Remove prefix if specified
      if (options.stripPrefix) {
        proxyPath = proxyPath.replace(new RegExp(`^${options.stripPrefix}`), '');
      }
      
      // Proxy the request 
      return proxyService.proxyRequest(serviceName, request, proxyPath);
    };
    
    // Add routes for all HTTP methods
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    methods.forEach(method => {
      this.add(method, path, proxyHandler);
    });
    
    return this;
  }
  
  /**
   * Add a versioned route with validated parameters
   *
   * @param {string} method - HTTP method to match
   * @param {string} path - URL path pattern with :param placeholders
   * @param {string} paramType - Parameter type from config
   * @param {string} paramName - Parameter name in the path
   * @param {...Function} handlers - Handler functions
   * @returns {Router} The router instance for chaining
   */
  addVersionedValidated(method, path, paramType, paramName, ...handlers) {
    if (!this.config) {
      throw new Error('Config instance required for versioned validated routes');
    }
    
    const versionInfo = this.config.getVersionInfo();
    if (!versionInfo.enabled) {
      // If versioning is disabled, just add a validated route
      return this.addValidated(method, path, paramType, paramName, ...handlers);
    }
    
    // Add validated route for each version
    for (const version of versionInfo.supported) {
      const versionedPath = `/v${version}${path}`;
      this.addValidated(method, versionedPath, paramType, paramName, ...handlers);
    }
    
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
    // Routes are checked in order of priority as defined in the config
    // 1. Exact path match (highest priority)
    // 2. Parameter path match (medium priority)
    // 3. Regex path match (lowest priority)
    
    // Start with exact path matches
    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (!route.isRegex && route.path === path) {
        return { ...route, params: {} };
      }
    }
    
    // Then check parameter paths
    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (!route.isRegex && route.path.includes(":")) {
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
    
    // Finally check regex paths
    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (route.isRegex) {
        const match = path.match(route.path);
        if (match) {
          const params = {};
          
          // If named capture groups exist, use them as params
          if (route.path.toString().includes('?<')) {
            for (const [key, value] of Object.entries(match.groups || {})) {
              params[key] = value;
            }
          } else {
            // Otherwise use numeric indices (excluding the full match at index 0)
            for (let i = 1; i < match.length; i++) {
              params[i - 1] = match[i];
            }
          }
          
          return { ...route, params };
        }
      }
    }

    return null;
  }

  /**
   * Check if a parameterized path pattern matches a concrete path
   *
   * @param {string|RegExp} pattern - Path pattern with parameters or regex
   * @param {string} path - Concrete path to match
   * @returns {boolean} Whether the pattern matches the path
   */
  pathMatchesWithParams(pattern, path) {
    // Handle regex patterns
    if (pattern instanceof RegExp) {
      return pattern.test(path);
    }
    
    // Handle string patterns with path parameters
    if (typeof pattern === 'string' && !pattern.includes(":")) return false;

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
          .filter((r) => {
            if (r.isRegex) {
              return this.pathMatchesWithParams(r.path, path);
            }
            return r.path === path || this.pathMatchesWithParams(r.path, path);
          })
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
      return this.errorResponse(error, originalRequest, context);
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
   * @param {Object} context - Request context
   * @returns {Response} Error response
   */
  errorResponse(error, request, context = {}) {
    // Use the logger if available in the context, otherwise fallback to console
    if (context.services?.logger) {
      context.services.logger.error("Router error", {
        error,
        path: new URL(request.url).pathname,
        method: request.method,
        requestId: context.services.logger.getRequestId(request)
      });
    } else {
      console.error("Router error:", error);
    }

    // Use the error handler if available in the context
    if (context.services?.errorHandler) {
      return context.services.errorHandler(error, request);
    }

    // Fallback error handling
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