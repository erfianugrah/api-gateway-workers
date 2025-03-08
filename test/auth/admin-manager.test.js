/**
 * Tests for the admin manager
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Create mocks before importing
jest.mock("../../src/auth/keyGenerator", () => ({
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

jest.mock("../../src/auth/auditLogger", () => ({
  logAdminAction: jest.fn().mockResolvedValue("mock-log-id"),
}));

// Import after mocking
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
      expect(result.key).toBe("km_test-admin-key");
      expect(mockEnv.KV.put).toHaveBeenCalledWith(
        "system:setup_completed",
        "true",
      );

      // Verify the createApiKey call
      const { createApiKey } = require("../../src/auth/keyGenerator");
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
      const { logAdminAction } = require("../../src/auth/auditLogger");
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
      const { createApiKey } = require("../../src/auth/keyGenerator");
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
  });
});
