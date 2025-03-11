import { ApiError } from "../../core/errors/ApiError.js";

/**
 * Create an error handler middleware
 *
 * @param {Logger} logger - Logger instance
 * @returns {Function} Error handler function
 */
export function createErrorHandler(logger) {
  /**
   * Error handler middleware for standardized error responses
   *
   * @param {Error} error - The error that occurred
   * @param {Request} request - The original request
   * @returns {Response} Formatted error response
   */
  return function errorHandler(error, request) {
    // Create a context with request information
    const context = {
      path: new URL(request.url).pathname,
      method: request.method,
      error: error,
      requestId: logger.getRequestId(request)
    };
    
    // Log differently based on error type
    if (error instanceof ApiError) {
      // For ApiErrors use appropriate log level based on status code
      const logLevel = error.statusCode >= 500 ? 'error' : 'warn';
      logger[logLevel](`API Error: ${error.message}`, {
        ...context,
        operation: error.code || 'API_ERROR',
        statusCode: error.statusCode
      });
      
      return new Response(
        JSON.stringify(error.toResponse()),
        {
          status: error.statusCode,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, X-API-Key",
          },
        },
      );
    }

    // For unexpected errors, log at error level and return a generic 500 response
    logger.error(`Unexpected error: ${error.message}`, {
      ...context,
      operation: 'INTERNAL_ERROR'
    });
    
    const genericError = {
      error: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
      status: 500,
    };

    return new Response(
      JSON.stringify(genericError),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-API-Key",
        },
      },
    );
  };
}
