/**
 * Base controller with shared functionality
 */
export class BaseController {
  /**
   * Create a new controller
   *
   * @param {Object} services - Service dependencies
   */
  constructor(services = {}) {
    this.services = services;
  }

  /**
   * Create a request handler with error handling
   *
   * @param {Function} handlerFn - Handler function
   * @returns {Function} Request handler
   */
  handle(handlerFn) {
    return async (request, context) => {
      try {
        // Get our error handler from the context
        const errorHandler = context.services?.errorHandler;

        // Log entry to the endpoint
        if (context.services?.logger) {
          context.services.logger.debug(`Request: ${request.method} ${new URL(request.url).pathname}`, {
            requestId: context.services.logger.getRequestId(request),
            operation: `${this.constructor.name}.${handlerFn.name}`,
          });
        }

        return await handlerFn.call(this, request, context);
      } catch (error) {
        // Use our error handler from the context, or a fallback if not available
        if (context.services?.errorHandler) {
          return context.services.errorHandler(error, request);
        } else {
          console.error("Error processing request (fallback handler):", error);

          return new Response(JSON.stringify({
            error: "An error occurred",
            code: "INTERNAL_ERROR",
          }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      }
    };
  }

  /**
   * Get admin info from request
   *
   * @param {Request} request - HTTP request
   * @returns {Object} Admin info
   */
  getAdminInfo(request) {
    return {
      keyId: request.headers.get("X-Admin-ID"),
      email: request.headers.get("X-Admin-Email"),
      role: request.headers.get("X-Admin-Role"),
      name: request.headers.get("X-Admin-Name"),
      scopes: [],
    };
  }
}
