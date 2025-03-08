/**
 * Test for the auth middleware
 */
import { describe, expect, it, jest } from "@jest/globals";
import { authMiddleware } from "../../src/auth/index.js";

// Basic successful test
describe("Auth Middleware", () => {
  it("should reject requests without API keys", async () => {
    // Create mock request with no API key
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue(null)
      }
    };
    
    // Mock environment
    const mockEnv = {};
    
    // Call the middleware
    const result = await authMiddleware(mockRequest, mockEnv);
    
    // Verify request header check
    expect(mockRequest.headers.get).toHaveBeenCalledWith("X-Api-Key");
    
    // Verify unauthorized response
    expect(result.authorized).toBe(false);
    expect(result.error).toBe("Authentication required");
    expect(result.status).toBe(401);
  });
});