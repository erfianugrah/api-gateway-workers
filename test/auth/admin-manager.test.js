import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  createAdminKey,
  getAdminKey,
  isSetupCompleted,
  listAdminKeys,
  revokeAdminKey,
  setupFirstAdmin,
} from "../../src/auth/adminManager.js";

// Mock the auth/keyGenerator module
jest.mock("../../src/auth/keyGenerator.js", () => ({
  createApiKey: jest.fn().mockImplementation(async (keyData, env) => {
    return {
      id: "test-admin-id",
      key: "km_test-admin-key",
      name: keyData.name,
      owner: keyData.owner || keyData.name,
      email: keyData.email,
      scopes: keyData.scopes,
      role: keyData.role,
      status: "active",
      createdAt: Date.now(),
      lastUsedAt: 0,
    };
  }),
}));

// Mock the auth/auditLogger module
jest.mock("../../src/auth/auditLogger.js", () => ({
  logAdminAction: jest.fn().mockImplementation(async () => {
    return "mock-log-id";
  }),
}));

describe("Admin Manager", () => {
  let mockEnv;

  beforeEach(() => {
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

    // Reset all mocks
    jest.clearAllMocks();
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
      expect(result.key).toBe("km_test-admin-key");
      expect(mockEnv.KV.put).toHaveBeenCalledWith(
        "system:setup_completed",
        "true",
      );

      // Verify the createApiKey call
      const { createApiKey } = require("../../src/auth/keyGenerator.js");
      expect(createApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining("Super Admin"),
          email: "admin@example.com",
          scopes: expect.arrayContaining([
            "admin:keys:*",
            "admin:users:*",
            "admin:system:*",
          ]),
          metadata: expect.objectContaining({
            isFirstAdmin: true,
          }),
        }),
        mockEnv,
      );

      // Verify audit logging
      const { logAdminAction } = require("../../src/auth/auditLogger.js");
      expect(logAdminAction).toHaveBeenCalledWith(
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
      expect(result.role).toBe("KEY_ADMIN");

      // Verify createApiKey was called correctly
      const { createApiKey } = require("../../src/auth/keyGenerator.js");
      expect(createApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Admin",
          email: "test@example.com",
          role: "KEY_ADMIN",
          scopes: expect.arrayContaining([
            "admin:keys:create",
            "admin:keys:read",
          ]),
          metadata: expect.objectContaining({
            isAdmin: true,
          }),
        }),
        mockEnv,
      );
    });

    it("should allow custom scopes for CUSTOM role", async () => {
      const adminData = {
        name: "Custom Admin",
        email: "custom@example.com",
        role: "CUSTOM",
        scopes: ["admin:keys:read", "admin:users:read"],
      };

      // Create custom admin key
      const result = await createAdminKey(adminData, mockEnv);

      // Check results
      expect(result).toBeDefined();
      expect(result.role).toBe("CUSTOM");

      // Verify createApiKey was called with the custom scopes
      const { createApiKey } = require("../../src/auth/keyGenerator.js");
      expect(createApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ["admin:keys:read", "admin:users:read"],
        }),
        mockEnv,
      );
    });

    it("should throw error for invalid scopes", async () => {
      const adminData = {
        name: "Invalid Admin",
        email: "invalid@example.com",
        role: "CUSTOM",
        scopes: ["invalid:scope"],
      };

      // Expect error for invalid scopes
      await expect(createAdminKey(adminData, mockEnv)).rejects.toThrow(
        "Invalid admin scopes: invalid:scope",
      );
    });

    it("should throw error if neither role nor scopes are provided", async () => {
      const adminData = {
        name: "Invalid Admin",
        email: "invalid@example.com",
        // No role or scopes
      };

      await expect(createAdminKey(adminData, mockEnv)).rejects.toThrow(
        "Either a valid role or custom scopes must be provided",
      );
    });

    it("should throw error for invalid role", async () => {
      const adminData = {
        name: "Invalid Admin",
        email: "invalid@example.com",
        role: "INVALID_ROLE",
      };

      await expect(createAdminKey(adminData, mockEnv)).rejects.toThrow(
        "Invalid role: INVALID_ROLE",
      );
    });
  });

  describe("getAdminKey", () => {
    it("should retrieve an admin key by ID", async () => {
      // Setup admin key in storage
      const adminKey = {
        id: "admin-id",
        name: "Admin Key",
        role: "KEY_ADMIN",
        status: "active",
      };

      mockEnv.KV.data.set("key:admin-id", JSON.stringify(adminKey));
      mockEnv.KV.data.set("index:admin:admin-id", "true");

      // Get the admin key
      const result = await getAdminKey("admin-id", mockEnv);

      // Check result
      expect(result).toEqual(adminKey);
    });

    it("should return null for non-admin keys", async () => {
      // Setup regular key in storage
      const regularKey = {
        id: "regular-id",
        name: "Regular Key",
        status: "active",
      };

      mockEnv.KV.data.set("key:regular-id", JSON.stringify(regularKey));
      // No admin index for this key

      // Try to get the key as an admin key
      const result = await getAdminKey("regular-id", mockEnv);

      // Should return null
      expect(result).toBeNull();
    });

    it("should return null for non-existent keys", async () => {
      const result = await getAdminKey("non-existent-id", mockEnv);
      expect(result).toBeNull();
    });
  });

  describe("revokeAdminKey", () => {
    it("should revoke an admin key", async () => {
      // Setup existing admin key
      const adminKey = {
        id: "admin-to-revoke",
        name: "Admin To Revoke",
        owner: "Test",
        email: "revoke@example.com",
        status: "active",
        scopes: ["admin:keys:read"],
        role: "KEY_VIEWER",
      };

      mockEnv.KV.data.set("key:admin-to-revoke", JSON.stringify(adminKey));
      mockEnv.KV.data.set("index:admin:admin-to-revoke", "true");

      // Perform revocation
      const result = await revokeAdminKey(
        "admin-to-revoke",
        "revoker-id",
        "Testing revocation",
        mockEnv,
      );

      // Check results
      expect(result.success).toBe(true);
      expect(result.id).toBe("admin-to-revoke");

      // Check that the key was updated in storage
      const updatedKeyJson = mockEnv.KV.data.get("key:admin-to-revoke");
      const updatedKey = JSON.parse(updatedKeyJson);
      expect(updatedKey.status).toBe("revoked");
      expect(updatedKey.revokedBy).toBe("revoker-id");
      expect(updatedKey.revokedReason).toBe("Testing revocation");

      // Verify audit logging
      const { logAdminAction } = require("../../src/auth/auditLogger.js");
      expect(logAdminAction).toHaveBeenCalledWith(
        "revoker-id",
        "revoke_admin",
        expect.objectContaining({
          revokedAdminId: "admin-to-revoke",
          reason: "Testing revocation",
        }),
        mockEnv,
      );
    });

    it("should handle already revoked keys", async () => {
      // Setup already revoked admin key
      const adminKey = {
        id: "already-revoked",
        name: "Already Revoked",
        owner: "Test",
        email: "already@example.com",
        status: "revoked",
        scopes: ["admin:keys:read"],
        role: "KEY_VIEWER",
      };

      mockEnv.KV.data.set("key:already-revoked", JSON.stringify(adminKey));
      mockEnv.KV.data.set("index:admin:already-revoked", "true");

      // Try to revoke an already revoked key
      const result = await revokeAdminKey(
        "already-revoked",
        "revoker-id",
        "Test",
        mockEnv,
      );

      // Check results
      expect(result.success).toBe(true);
      expect(result.message).toContain("already revoked");

      // No audit log for already revoked keys
      const { logAdminAction } = require("../../src/auth/auditLogger.js");
      expect(logAdminAction).not.toHaveBeenCalled();
    });

    it("should throw error for non-existent keys", async () => {
      await expect(
        revokeAdminKey("non-existent", "revoker-id", "Test", mockEnv),
      )
        .rejects.toThrow("Admin key not found");
    });
  });

  describe("listAdminKeys", () => {
    it("should list all admin keys", async () => {
      // Setup multiple admin keys
      const admin1 = {
        id: "admin1",
        name: "Admin 1",
        role: "SUPER_ADMIN",
        status: "active",
      };

      const admin2 = {
        id: "admin2",
        name: "Admin 2",
        role: "KEY_ADMIN",
        status: "active",
      };

      mockEnv.KV.data.set("key:admin1", JSON.stringify(admin1));
      mockEnv.KV.data.set("key:admin2", JSON.stringify(admin2));
      mockEnv.KV.data.set("index:admin:admin1", "true");
      mockEnv.KV.data.set("index:admin:admin2", "true");

      // Add a regular non-admin key
      mockEnv.KV.data.set(
        "key:regular",
        JSON.stringify({ id: "regular", name: "Regular Key" }),
      );

      // Mock the list response
      mockEnv.KV.list.mockResolvedValueOnce({
        keys: [
          { name: "index:admin:admin1", value: "true" },
          { name: "index:admin:admin2", value: "true" },
        ],
      });

      // Get all admin keys
      const result = await listAdminKeys(mockEnv);

      // Check results
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(admin1);
      expect(result[1]).toEqual(admin2);
    });

    it("should handle empty admin list", async () => {
      // Mock empty list response
      mockEnv.KV.list.mockResolvedValueOnce({ keys: [] });

      // Get admin keys when none exist
      const result = await listAdminKeys(mockEnv);

      // Should return empty array
      expect(result).toEqual([]);
    });

    it("should filter out deleted admin keys", async () => {
      // Setup one existing and one deleted admin key
      const admin = {
        id: "admin",
        name: "Admin",
        role: "KEY_ADMIN",
        status: "active",
      };

      mockEnv.KV.data.set("key:admin", JSON.stringify(admin));
      mockEnv.KV.data.set("index:admin:admin", "true");
      mockEnv.KV.data.set("index:admin:deleted", "true");
      // No key data for 'deleted'

      // Mock the list response
      mockEnv.KV.list.mockResolvedValueOnce({
        keys: [
          { name: "index:admin:admin", value: "true" },
          { name: "index:admin:deleted", value: "true" },
        ],
      });

      // Get all admin keys
      const result = await listAdminKeys(mockEnv);

      // Should only include the existing admin
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(admin);
    });
  });
});
