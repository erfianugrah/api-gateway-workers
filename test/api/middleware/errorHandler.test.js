import { jest } from "@jest/globals";
import { createErrorHandler } from "../../../src/api/middleware/errorHandler.js";
import { ApiError, ForbiddenError, ValidationError, NotFoundError } from "../../../src/core/errors/ApiError.js";

describe("errorHandler", () => {
  let logger;
  let request;

  beforeEach(() => {
    // Mock logger
    logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      getRequestId: jest.fn().mockReturnValue("test-request-id"),
    };

    // Mock request
    request = new Request("https://api.example.com/test-path", {
      method: "GET",
      headers: {
        "X-Request-ID": "test-request-id",
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should create an error handler function", () => {
    const handler = createErrorHandler(logger);

    expect(typeof handler).toBe("function");
  });

  it("should handle ApiError with appropriate status code", async () => {
    const handler = createErrorHandler(logger);
    const error = new ValidationError("Invalid input");

    const response = await handler(error, request);

    // Check that the response has the right status code
    expect(response.status).toBe(400);

    // Check that logger was called with appropriate level
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();

    // Check that the response body is correct
    const body = await response.json();

    expect(body.error).toBe("Invalid input");
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.status).toBe(400);
  });

  it("should log 5xx errors at error level and 4xx errors at warn level", async () => {
    const handler = createErrorHandler(logger);

    // Test with 403 error
    await handler(new ForbiddenError("No permission"), request);
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();

    jest.clearAllMocks();

    // Test with 500 error - use a valid error status code
    const serverError = new ApiError("Server error", "SERVER_ERROR", 500);

    serverError.statusCode = 500; // Ensure statusCode is set correctly
    await handler(serverError, request);
    expect(logger.error).toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("should log unexpected errors at error level", async () => {
    const handler = createErrorHandler(logger);
    const error = new Error("Unexpected error");

    const response = await handler(error, request);

    // Check that the response is a generic 500
    expect(response.status).toBe(500);

    // Check that logger was called at error level
    expect(logger.error).toHaveBeenCalled();

    // Check context in the log
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected error"),
      expect.objectContaining({
        error,
        path: "/test-path",
        method: "GET",
        requestId: "test-request-id",
        operation: "INTERNAL_ERROR",
      })
    );

    // Check the response body
    const body = await response.json();

    expect(body.error).toBe("An unexpected error occurred");
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.status).toBe(500);
  });

  it("should include appropriate headers in the response", async () => {
    const handler = createErrorHandler(logger);
    const error = new NotFoundError("Resource not found");

    const response = await handler(error, request);

    // Check CORS headers
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");

    // Check Content-Type
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("should add request context to error logs", async () => {
    const handler = createErrorHandler(logger);
    const error = new Error("Test error");

    await handler(error, request);

    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        path: "/test-path",
        method: "GET",
        requestId: "test-request-id",
      })
    );
  });
});
