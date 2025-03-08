import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { hasScope, validateApiKey } from "../../src/auth/keyValidator.js";

describe("Key Validator", () => {
  let mockEnv;

  beforeEach(() => {
    // Create a KV storage mock
    const kvStorage = {
      data: new Map(),
      get: jest.fn(async (key) => kvStorage.data.get(key)),
      put: jest.fn(async (key, value) => kvStorage.data.set(key, value)),
      delete: jest.fn(async (key) => kvStorage.data.delete(key)),
    };

    // Mock env with KV binding
    mockEnv = { KV: kvStorage };

    // Set up test data
    mockEnv.KV.data.set("lookup:km_active_key", "test-key-id");
    mockEnv.KV.data.set(
      "key:test-key-id",
      JSON.stringify({
        id: "test-key-id",
        name: "Test Key",
        owner: "Test Owner",
        email: "test@example.com",
        scopes: ["read:data", "write:data"],
        status: "active",
        createdAt: Date.now(),
        lastUsedAt: 0,
      }),
    );

    mockEnv.KV.data.set("lookup:km_expired_key", "expired-key-id");
    mockEnv.KV.data.set(
      "key:expired-key-id",
      JSON.stringify({
        id: "expired-key-id",
        name: "Expired Key",
        owner: "Test Owner",
        email: "test@example.com",
        scopes: ["read:data"],
        status: "active",
        createdAt: Date.now() - 86400000, // 1 day ago
        expiresAt: Date.now() - 3600000, // 1 hour ago
        lastUsedAt: 0,
      }),
    );

    mockEnv.KV.data.set("lookup:km_revoked_key", "revoked-key-id");
    mockEnv.KV.data.set(
      "key:revoked-key-id",
      JSON.stringify({
        id: "revoked-key-id",
        name: "Revoked Key",
        owner: "Test Owner",
        email: "test@example.com",
        scopes: ["read:data"],
        status: "revoked",
        createdAt: Date.now() - 86400000, // 1 day ago
        lastUsedAt: 0,
      }),
    );

    mockEnv.KV.data.set("lookup:km_admin_key", "admin-key-id");
    mockEnv.KV.data.set(
      "key:admin-key-id",
      JSON.stringify({
        id: "admin-key-id",
        name: "Admin Key",
        owner: "Admin Owner",
        email: "admin@example.com",
        scopes: ["admin:keys:read", "admin:keys:create"],
        role: "KEY_ADMIN",
        status: "active",
        createdAt: Date.now(),
        lastUsedAt: 0,
      }),
    );

    mockEnv.KV.data.set("lookup:km_wildcard_key", "wildcard-key-id");
    mockEnv.KV.data.set(
      "key:wildcard-key-id",
      JSON.stringify({
        id: "wildcard-key-id",
        name: "Wildcard Key",
        owner: "Admin Owner",
        email: "admin@example.com",
        scopes: ["admin:keys:*", "read:*"],
        role: "CUSTOM",
        status: "active",
        createdAt: Date.now(),
        lastUsedAt: 0,
      }),
    );
  });

  describe("validateApiKey", () => {
    it("should validate an active key", async () => {
      const result = await validateApiKey("km_active_key", [], mockEnv);

      expect(result.valid).toBe(true);
      expect(result.keyId).toBe("test-key-id");
      expect(result.owner).toBe("Test Owner");
      expect(result.email).toBe("test@example.com");
      expect(result.scopes).toEqual(["read:data", "write:data"]);

      // Should update lastUsedAt timestamp
      expect(mockEnv.KV.put).toHaveBeenCalled();
    });

    it("should reject missing API key", async () => {
      const result = await validateApiKey("", [], mockEnv);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("No API key provided");
    });

    it("should reject invalid API key", async () => {
      const result = await validateApiKey("km_invalid_key", [], mockEnv);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid API key");
    });

    it("should reject revoked key", async () => {
      const result = await validateApiKey("km_revoked_key", [], mockEnv);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("not active");
    });

    it("should reject expired key and auto-revoke it", async () => {
      const result = await validateApiKey("km_expired_key", [], mockEnv);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");

      // Verify the key was revoked
      const expiredKey = JSON.parse(mockEnv.KV.data.get("key:expired-key-id"));
      expect(expiredKey.status).toBe("revoked");
      expect(expiredKey.revokedReason).toBe("expired");
    });

    it("should validate required scopes", async () => {
      // Key has the required scope
      const result1 = await validateApiKey(
        "km_active_key",
        ["read:data"],
        mockEnv,
      );
      expect(result1.valid).toBe(true);

      // Key does not have the required scope
      const result2 = await validateApiKey(
        "km_active_key",
        ["delete:data"],
        mockEnv,
      );
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain("required scopes");
      expect(result2.requiredScopes).toEqual(["delete:data"]);
      expect(result2.providedScopes).toEqual(["read:data", "write:data"]);
    });

    it("should handle wildcard scopes correctly", async () => {
      // Test wildcard scope matching
      const result1 = await validateApiKey("km_wildcard_key", [
        "admin:keys:read",
      ], mockEnv);
      expect(result1.valid).toBe(true);

      const result2 = await validateApiKey("km_wildcard_key", [
        "admin:keys:revoke",
      ], mockEnv);
      expect(result2.valid).toBe(true);

      const result3 = await validateApiKey(
        "km_wildcard_key",
        ["read:users"],
        mockEnv,
      );
      expect(result3.valid).toBe(true);

      const result4 = await validateApiKey("km_wildcard_key", [
        "admin:users:read",
      ], mockEnv);
      expect(result4.valid).toBe(false);
    });

    it("should clean up stale lookups", async () => {
      // Add a stale lookup entry
      mockEnv.KV.data.set("lookup:km_stale_key", "non-existent-id");

      // Validate the stale key
      const result = await validateApiKey("km_stale_key", [], mockEnv);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Key data not found");

      // Verify the stale lookup was removed
      expect(mockEnv.KV.delete).toHaveBeenCalledWith("lookup:km_stale_key");
    });

    it("should handle storage errors gracefully", async () => {
      // Make storage.get throw an error
      const originalGet = mockEnv.KV.get;
      mockEnv.KV.get = jest.fn().mockRejectedValue(new Error("Storage error"));

      // Should handle the error
      const result = await validateApiKey("km_active_key", [], mockEnv);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();

      // Restore original function
      mockEnv.KV.get = originalGet;
    });
  });

  describe("hasScope", () => {
    it("should check direct scope matches", () => {
      const key = {
        valid: true,
        scopes: ["read:data", "write:posts"],
      };

      expect(hasScope(key, "read:data")).toBe(true);
      expect(hasScope(key, "write:posts")).toBe(true);
      expect(hasScope(key, "delete:data")).toBe(false);
    });

    it("should handle wildcard scopes", () => {
      const key = {
        valid: true,
        scopes: ["admin:*", "read:data"],
      };

      expect(hasScope(key, "admin:users")).toBe(true);
      expect(hasScope(key, "admin:keys:read")).toBe(true);
      expect(hasScope(key, "read:data")).toBe(true);
      expect(hasScope(key, "write:data")).toBe(false);
    });

    it("should handle more specific wildcards", () => {
      const key = {
        valid: true,
        scopes: ["admin:keys:*", "admin:users:read"],
      };

      expect(hasScope(key, "admin:keys:read")).toBe(true);
      expect(hasScope(key, "admin:keys:create")).toBe(true);
      expect(hasScope(key, "admin:users:read")).toBe(true);
      expect(hasScope(key, "admin:users:create")).toBe(false);
      expect(hasScope(key, "admin:system:logs")).toBe(false);
    });

    it("should handle invalid inputs", () => {
      expect(hasScope(null, "read:data")).toBe(false);
      expect(hasScope({}, "read:data")).toBe(false);
      expect(hasScope({ valid: false, scopes: ["read:data"] }, "read:data"))
        .toBe(false);
      expect(hasScope({ valid: true }, "read:data")).toBe(false);
    });

    it("should handle case insensitive matching", () => {
      const key = {
        valid: true,
        scopes: ["Read:Data", "WRITE:POSTS"],
      };

      expect(hasScope(key, "read:data")).toBe(true);
      expect(hasScope(key, "write:posts")).toBe(true);
      expect(hasScope(key, "READ:DATA")).toBe(true);
    });
  });
});
