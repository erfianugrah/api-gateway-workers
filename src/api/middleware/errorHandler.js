import { ApiError } from "../../core/errors/ApiError.js";

/**
 * Error handler middleware for standardized error responses
 *
 * @param {Error} error - The error that occurred
 * @param {Request} request - The original request
 * @returns {Response} Formatted error response
 */
export function errorHandler(error, request) {
  // Log all errors
  console.error("Error processing request:", error);

  // If it's our ApiError type, use its formatting
  if (error instanceof ApiError) {
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

  // For unexpected errors, return a generic 500 response
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
}
