/**
 * Tests for the auth middleware
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// We need to manually create the mock before importing
jest.mock("../../src/auth/keyValidator", () => ({
  validateApiKey: jest.fn().mockImplementation(async (apiKey, scopes, env) => {
    if (apiKey === "km_valid_admin_key") {
      return {
        valid: true,
        keyId: "test-admin-id",
        owner: "Test Admin",
        email: "admin@example.com",
        scopes: ["admin:keys:read"],
        role: "KEY_ADMIN",
      };
    } else if (apiKey === "km_valid_regular_key") {
      return {
        valid: true,
        keyId: "test-user-id",
        owner: "Test User",
        email: "user@example.com",
        scopes: ["read:data", "write:data"],
      };
    } else {
      return {
        valid: false,
        error: "Invalid API key",
      };
    }
  }),
}));

// Now import the auth middleware
import { authMiddleware } from "../../src/auth/index.js";

describe("Auth Middleware", () => {
  let mockRequest;
  let mockEnv;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a mock request
    mockRequest = {
      headers: {
        get: jest.fn((header) => {
          if (header === "X-Api-Key") {
            return "km_valid_admin_key";
          }
          return null;
        }),
      },
    };

    // Create a mock environment
    mockEnv = {
      KV: {
        get: jest.fn(),
        put: jest.fn(),
      },
    };
  });

  it("should authorize requests with valid admin API keys", async () => {
    const result = await authMiddleware(mockRequest, mockEnv);

    // Validation function should be called with the right arguments
    expect(mockRequest.headers.get).toHaveBeenCalledWith("X-Api-Key");

    // Result should indicate authorization
    expect(result.authorized).toBe(true);
    expect(result.adminKey).toBeDefined();
    expect(result.adminKey.keyId).toBe("test-admin-id");
  });

  it("should reject requests without API keys", async () => {
    // Simulate no API key
    mockRequest.headers.get.mockReturnValue(null);

    const result = await authMiddleware(mockRequest, mockEnv);

    // Result should indicate rejection
    expect(result.authorized).toBe(false);
    expect(result.error).toBe("Authentication required");
    expect(result.status).toBe(401);
  });

  it("should reject non-admin API keys", async () => {
    // Simulate a regular, non-admin key
    mockRequest.headers.get.mockReturnValue("km_valid_regular_key");

    const result = await authMiddleware(mockRequest, mockEnv);

    // Result should indicate rejection due to lack of admin permissions
    expect(result.authorized).toBe(false);
    expect(result.error).toBe("This API key lacks administrative permissions");
    expect(result.status).toBe(403);
  });

  it("should handle validation errors", async () => {
    // Modify our imported mock to throw an error
    const validateApiKey =
      require("../../src/auth/keyValidator").validateApiKey;
    validateApiKey.mockRejectedValueOnce(new Error("Validation error"));

    const result = await authMiddleware(mockRequest, mockEnv);

    // Result should indicate an error
    expect(result.authorized).toBe(false);
    expect(result.error).toBe("Authentication error");
    expect(result.status).toBe(500);
  });
});
