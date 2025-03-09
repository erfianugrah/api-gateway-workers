/**
 * Basic test for setupFirstAdmin function
 */
import { describe, expect, it, jest } from "@jest/globals";

// Mock the required dependencies
jest.mock("../../src/auth/keyGenerator.js", () => ({
  createApiKey: jest.fn().mockResolvedValue({
    id: "test-admin-id",
    name: "Test Admin",
    email: "test@example.com",
    role: "SUPER_ADMIN",
    status: "active",
    metadata: { isFirstAdmin: true }
  })
}));

jest.mock("../../src/auth/auditLogger.js", () => ({
  logAdminAction: jest.fn().mockResolvedValue(undefined)
}));

// Import the function to test
import { setupFirstAdmin } from "../../src/auth/adminManager.js";

describe("setupFirstAdmin", () => {
  it("should set up the first admin successfully", async () => {
    // Mock environment
    const mockEnv = {
      KV: {
        get: jest.fn().mockResolvedValue(null), // Setup not completed
        put: jest.fn().mockResolvedValue(undefined)
      }
    };
    
    // Test data
    const adminData = {
      name: "First Admin",
      email: "admin@example.com"
    };
    
    // Call the function
    const result = await setupFirstAdmin(adminData, mockEnv);
    
    // Verify result
    expect(result).toBeDefined();
    expect(mockEnv.KV.put).toHaveBeenCalledWith(
      "system:setup_completed",
      "true"
    );
  });
  
  it("should throw error if setup already completed", async () => {
    // Mock environment with setup already completed
    const mockEnv = {
      KV: {
        get: jest.fn().mockResolvedValue("true"), // Setup already completed
        put: jest.fn()
      }
    };
    
    // Test data
    const adminData = {
      name: "Another Admin",
      email: "another@example.com"
    };
    
    // Expect error
    await expect(setupFirstAdmin(adminData, mockEnv)).rejects.toThrow(
      "Setup has already been completed"
    );
    
    // Verify KV.put was not called
    expect(mockEnv.KV.put).not.toHaveBeenCalled();
  });
});