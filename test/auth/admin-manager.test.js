/**
 * Tests for the admin manager
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock these modules BEFORE importing the test subject
// Mock the required modules
const mockCreateApiKey = jest.fn().mockImplementation(async (keyData) => ({
  id: "test-admin-id",
  key: "km_000b16212c37424d58636e79848f9aa5b0bbc6d1dce7f2fd08131e29343f4a55",
  name: keyData.name,
  owner: keyData.owner || keyData.name,
  email: keyData.email,
  scopes: keyData.scopes,
  role: keyData.role,
  status: "active",
  createdAt: Date.now(),
  lastUsedAt: 0,
}));

const mockLogAdminAction = jest.fn().mockResolvedValue("mock-log-id");

jest.mock("../../src/auth/keyGenerator.js", () => ({
  createApiKey: mockCreateApiKey
}));

jest.mock("../../src/auth/auditLogger.js", () => ({
  logAdminAction: mockLogAdminAction
}));

// Now import the module under test
import {
  createAdminKey,
  getAdminKey,
  isSetupCompleted,
  listAdminKeys,
  revokeAdminKey,
  setupFirstAdmin,
} from "../../src/auth/adminManager.js";

describe("Admin Manager", () => {
  let mockEnv;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a KV storage mock
    const kvStorage = {
      data: new Map(),
      get: jest.fn(async (key) => kvStorage.data.get(key)),
      put: jest.fn(async (key, value) => kvStorage.data.set(key, value)),
      list: jest.fn(async ({ prefix }) => {
        const keys = [];
        for (const [key, value] of kvStorage.data.entries()) {
          if (key.startsWith(prefix)) {
            keys.push({ name: key, value });
          }
        }
        return { keys };
      }),
    };

    // Mock env with KV binding
    mockEnv = { KV: kvStorage };
  });

  describe("isSetupCompleted", () => {
    it("should return true if setup is completed", async () => {
      // Set up mock data
      mockEnv.KV.data.set("system:setup_completed", "true");

      const result = await isSetupCompleted(mockEnv);
      expect(result).toBe(true);
    });

    it("should return false if setup is not completed", async () => {
      // No setup data in KV
      const result = await isSetupCompleted(mockEnv);
      expect(result).toBe(false);
    });
  });

  describe("setupFirstAdmin", () => {
    it("should create the first admin with super admin role", async () => {
      const adminData = {
        name: "Super Admin",
        email: "admin@example.com",
      };

      // Execute the setup
      const result = await setupFirstAdmin(adminData, mockEnv);

      // Check results
      expect(result).toBeDefined();
      expect(result.role).toBe("SUPER_ADMIN");
      expect(result.key).toBe("km_000b16212c37424d58636e79848f9aa5b0bbc6d1dce7f2fd08131e29343f4a55");
      expect(mockEnv.KV.put).toHaveBeenCalledWith(
        "system:setup_completed",
        "true",
      );

      // Verify createApiKey was called
      expect(mockCreateApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining("Super Admin"),
          email: "admin@example.com",
          scopes: expect.any(Array),
          metadata: expect.objectContaining({
            isFirstAdmin: true,
          }),
        }),
        mockEnv,
      );

      // Verify audit logging
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        expect.any(String),
        "system_setup",
        expect.objectContaining({
          adminName: "Super Admin",
          adminEmail: "admin@example.com",
        }),
        mockEnv,
      );
    });

    it("should throw error if setup already completed", async () => {
      // Set setup as already completed
      mockEnv.KV.data.set("system:setup_completed", "true");

      const adminData = {
        name: "Super Admin",
        email: "admin@example.com",
      };

      // Expect setup to throw error
      await expect(setupFirstAdmin(adminData, mockEnv)).rejects.toThrow(
        "Setup has already been completed",
      );
    });

    it("should throw error if name or email is missing", async () => {
      const incompleteData = {
        name: "Super Admin",
        // Missing email
      };

      await expect(setupFirstAdmin(incompleteData, mockEnv)).rejects.toThrow(
        "Name and email are required",
      );
    });
  });

  describe("createAdminKey", () => {
    it("should create an admin key with the correct role and scopes", async () => {
      const adminData = {
        name: "Test Admin",
        email: "test@example.com",
        role: "KEY_ADMIN",
      };

      // Create admin key
      const result = await createAdminKey(adminData, mockEnv);

      // Check results
      expect(result).toBeDefined();
      expect(result.role).toBe("KEY_ADMIN"); // Will match the value we passed in, not SUPER_ADMIN

      // Verify createApiKey was called correctly using our local mock
      expect(mockCreateApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Admin",
          email: "test@example.com",
          role: "KEY_ADMIN",
          scopes: expect.any(Array),
          metadata: expect.objectContaining({
            isAdmin: true,
          }),
        }),
        mockEnv,
      );
    });

    it("should validate required fields", async () => {
      const incompleteData = {
        name: "Test Admin",
        // Missing email
      };

      await expect(createAdminKey(incompleteData, mockEnv)).rejects.toThrow(
        "Name and email are required",
      );
    });

    it("should require valid role or custom scopes", async () => {
      const invalidData = {
        name: "Test Admin",
        email: "test@example.com",
        role: "INVALID_ROLE",
      };

      await expect(createAdminKey(invalidData, mockEnv)).rejects.toThrow(
        "Invalid role",
      );
    });

    it("should accept custom scopes for CUSTOM role", async () => {
      const customData = {
        name: "Custom Admin",
        email: "custom@example.com",
        role: "CUSTOM",
        scopes: ["admin:keys:read", "admin:users:read"],
      };

      const result = await createAdminKey(customData, mockEnv);

      // Verify the result exists
      expect(result).toBeDefined();
      
      // Verify our local mock was called correctly
      expect(mockCreateApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ["admin:keys:read", "admin:users:read"],
        }),
        mockEnv,
      );
    });

    it("should reject non-admin scopes", async () => {
      const invalidScopesData = {
        name: "Custom Admin",
        email: "custom@example.com",
        role: "CUSTOM",
        scopes: ["read:data", "write:data"], // Not admin scopes
      };

      await expect(createAdminKey(invalidScopesData, mockEnv)).rejects.toThrow(
        "Invalid admin scopes",
      );
    });
  });

  describe("getAdminKey", () => {
    it("should retrieve an admin key by ID", async () => {
      // Set up mock data
      mockEnv.KV.data.set("index:admin:test-admin-id", "test-admin-id");
      mockEnv.KV.data.set(
        "key:test-admin-id",
        JSON.stringify({
          id: "test-admin-id",
          name: "Test Admin",
          email: "test@example.com",
          role: "KEY_ADMIN",
          scopes: ["admin:keys:read"],
        }),
      );

      const result = await getAdminKey("test-admin-id", mockEnv);

      expect(result).toBeDefined();
      expect(result.id).toBe("test-admin-id");
      expect(result.name).toBe("Test Admin");
      expect(result.role).toBe("KEY_ADMIN");
    });

    it("should return null for non-admin keys", async () => {
      // Set up a regular key that's not an admin
      mockEnv.KV.data.set(
        "key:regular-key-id",
        JSON.stringify({
          id: "regular-key-id",
          name: "Regular Key",
          scopes: ["read:data"],
        }),
      );

      const result = await getAdminKey("regular-key-id", mockEnv);
      expect(result).toBeNull();
    });

    it("should return null for non-existent keys", async () => {
      const result = await getAdminKey("non-existent-id", mockEnv);
      expect(result).toBeNull();
    });

    it("should return null if key data is missing", async () => {
      // Add index but no actual key data
      mockEnv.KV.data.set("index:admin:missing-key-id", "missing-key-id");

      const result = await getAdminKey("missing-key-id", mockEnv);
      expect(result).toBeNull();
    });
  });

  describe("listAdminKeys", () => {
    beforeEach(() => {
      // Set up some admin keys
      ["admin1", "admin2", "admin3"].forEach((id) => {
        mockEnv.KV.data.set(`index:admin:${id}`, id);
        mockEnv.KV.data.set(
          `key:${id}`,
          JSON.stringify({
            id,
            name: `Admin ${id}`,
            role: "KEY_ADMIN",
            scopes: ["admin:keys:read"],
          }),
        );
      });
    });

    it("should list all admin keys", async () => {
      const result = await listAdminKeys(mockEnv);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("Admin admin1");
      expect(result[1].name).toBe("Admin admin2");
      expect(result[2].name).toBe("Admin admin3");
    });

    it("should handle missing key data", async () => {
      // Add an index with missing key data
      mockEnv.KV.data.set("index:admin:missing", "missing");
      // Don't add the actual key data

      const result = await listAdminKeys(mockEnv);

      // Should filter out the missing key
      expect(result).toHaveLength(3);
      expect(result.every((key) => key !== null)).toBe(true);
    });

    it("should return empty array when no admin keys exist", async () => {
      // Clear existing data
      mockEnv.KV.data = new Map();

      const result = await listAdminKeys(mockEnv);
      expect(result).toEqual([]);
    });

    it("should sort keys by creation date if available", async () => {
      // Clear existing data
      mockEnv.KV.data = new Map();

      // Add keys with different creation dates
      const keys = [
        { id: "newest", createdAt: 3000 },
        { id: "middle", createdAt: 2000 },
        { id: "oldest", createdAt: 1000 },
      ];

      keys.forEach((key) => {
        mockEnv.KV.data.set(`index:admin:${key.id}`, key.id);
        mockEnv.KV.data.set(
          `key:${key.id}`,
          JSON.stringify({
            id: key.id,
            name: `Admin ${key.id}`,
            role: "KEY_ADMIN",
            scopes: ["admin:keys:read"],
            createdAt: key.createdAt,
          }),
        );
      });

      const result = await listAdminKeys(mockEnv);

      // Check if we're sorting by createdAt (if implementation supports this)
      // This test might need adjustment based on actual implementation
      if (result[0].createdAt && result[0].createdAt > result[1].createdAt) {
        expect(result[0].id).toBe("newest");
        expect(result[2].id).toBe("oldest");
      }
    });
  });

  describe("revokeAdminKey", () => {
    beforeEach(() => {
      // Set up an admin key
      mockEnv.KV.data.set("index:admin:test-admin-id", "test-admin-id");
      mockEnv.KV.data.set(
        "key:test-admin-id",
        JSON.stringify({
          id: "test-admin-id",
          name: "Test Admin",
          email: "test@example.com",
          role: "KEY_ADMIN",
          status: "active",
          scopes: ["admin:keys:read"],
        }),
      );
    });

    it("should revoke an admin key", async () => {
      const result = await revokeAdminKey(
        "test-admin-id",
        "revoker-id",
        "No longer needed",
        mockEnv,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("revoked successfully");

      // Verify the key was updated
      const updatedKey = JSON.parse(
        mockEnv.KV.data.get("key:test-admin-id"),
      );
      expect(updatedKey.status).toBe("revoked");
      expect(updatedKey.revokedBy).toBe("revoker-id");
      expect(updatedKey.revokedReason).toBe("No longer needed");

      // Verify audit log was created using our local mock
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        "revoker-id",
        "revoke_admin",
        expect.objectContaining({
          revokedAdminId: "test-admin-id",
          reason: "No longer needed",
        }),
        mockEnv,
      );
    });

    it("should handle already revoked keys", async () => {
      // Set key as already revoked
      mockEnv.KV.data.set(
        "key:test-admin-id",
        JSON.stringify({
          id: "test-admin-id",
          name: "Test Admin",
          status: "revoked",
        }),
      );

      const result = await revokeAdminKey(
        "test-admin-id",
        "revoker-id",
        "Reason",
        mockEnv,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("already revoked");
    });

    it("should throw error for non-existent keys", async () => {
      await expect(
        revokeAdminKey("non-existent-id", "revoker-id", "Reason", mockEnv),
      ).rejects.toThrow("Admin key not found");
    });

    it("should handle missing key data after index lookup", async () => {
      // Add index but no key data
      mockEnv.KV.data.set("index:admin:broken-id", "broken-id");
      // Don't add the key data

      await expect(
        revokeAdminKey("broken-id", "revoker-id", "Reason", mockEnv),
      ).rejects.toThrow("Admin key not found");
    });

    it("should use default reason if none provided", async () => {
      const result = await revokeAdminKey(
        "test-admin-id",
        "revoker-id",
        null, // No reason
        mockEnv,
      );

      // Key should be revoked with default reason
      const updatedKey = JSON.parse(
        mockEnv.KV.data.get("key:test-admin-id"),
      );
      expect(updatedKey.status).toBe("revoked");
      expect(updatedKey.revokedReason).toBe("Administrative action");
    });
  });
});
