/**
 * Comprehensive tests for the revokeAdminKey function
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock dependencies
jest.mock("../../src/auth/keyGenerator.js");
jest.mock("../../src/auth/auditLogger.js", () => ({
  logAdminAction: jest.fn().mockResolvedValue(undefined),
}));

// Import the function to test
import { revokeAdminKey } from "../../src/auth/adminManager.js";
import { logAdminAction } from "../../src/auth/auditLogger.js";

describe("revokeAdminKey", () => {
  let mockEnv;
  const testAdminId = "test-admin-id";
  const revokerId = "revoker-id";

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock KV storage
    const kvStorage = {
      data: new Map(),
      get: jest.fn(async (key) => kvStorage.data.get(key)),
      put: jest.fn(async (key, value) => kvStorage.data.set(key, value)),
    };

    // Set up an admin key in KV
    kvStorage.data.set(`index:admin:${testAdminId}`, testAdminId);
    kvStorage.data.set(
      `key:${testAdminId}`,
      JSON.stringify({
        id: testAdminId,
        name: "Test Admin",
        email: "test@example.com",
        role: "KEY_ADMIN",
        status: "active",
        scopes: ["admin:keys:read"],
      })
    );

    // Mock env with KV binding
    mockEnv = { KV: kvStorage };
  });

  it("should revoke an admin key", async () => {
    const result = await revokeAdminKey(
      testAdminId,
      revokerId,
      "No longer needed",
      mockEnv
    );

    // Check result structure
    expect(result.success).toBe(true);
    expect(result.message).toContain("revoked successfully");
    expect(result.id).toBe(testAdminId);

    // Verify the key was updated in KV
    const updatedKeyData = await mockEnv.KV.get(`key:${testAdminId}`);
    const updatedKey = JSON.parse(updatedKeyData);

    expect(updatedKey.status).toBe("revoked");
    expect(updatedKey.revokedBy).toBe(revokerId);
    expect(updatedKey.revokedReason).toBe("No longer needed");
    expect(updatedKey.revokedAt).toBeDefined();
  });

  it("should use default reason when none provided", async () => {
    const result = await revokeAdminKey(
      testAdminId,
      revokerId,
      null, // No reason provided
      mockEnv
    );

    // Verify success
    expect(result.success).toBe(true);

    // Verify the key gets the default reason
    const updatedKeyData = await mockEnv.KV.get(`key:${testAdminId}`);
    const updatedKey = JSON.parse(updatedKeyData);

    expect(updatedKey.revokedReason).toBe("Administrative action");
  });

  it("should return success for already revoked keys", async () => {
    // Set up an already revoked key
    mockEnv.KV.data.set(
      `key:${testAdminId}`,
      JSON.stringify({
        id: testAdminId,
        name: "Already Revoked Admin",
        status: "revoked",
        revokedAt: Date.now() - 1000, // Revoked a second ago
        revokedBy: "previous-revoker",
        revokedReason: "Previous reason",
      })
    );

    const result = await revokeAdminKey(
      testAdminId,
      revokerId,
      "New reason",
      mockEnv
    );

    // Should still return success
    expect(result.success).toBe(true);
    expect(result.message).toContain("already revoked");

    // Should not update the key
    expect(mockEnv.KV.put).not.toHaveBeenCalled();
  });

  it("should throw error for non-existent keys", async () => {
    await expect(
      revokeAdminKey("non-existent-id", revokerId, "reason", mockEnv)
    ).rejects.toThrow("Admin key not found");

    // No assertions needed for logAdminAction
  });

  it("should throw error when index exists but key data is missing", async () => {
    // Set up index but no key data
    mockEnv.KV.data.set("index:admin:missing-key", "missing-key");
    // No key data for this admin

    await expect(
      revokeAdminKey("missing-key", revokerId, "reason", mockEnv)
    ).rejects.toThrow("Admin key not found");
  });
});
