import { Container } from "../../src/infrastructure/di/Container.js";

/**
 * Test container with pre-configured mocks
 */
export class TestContainer extends Container {
  /**
   * Create a new test container
   */
  constructor() {
    super();
    this.setupDefaultMocks();
  }

  /**
   * Set up default mocks for common services
   */
  setupDefaultMocks() {
    // Mock storage
    this.register("storage", () => ({
      get: jest.fn().mockResolvedValue(null),
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue(new Map()),
      transaction: jest.fn(() => ({
        put: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      })),
    }));

    // Mock key repository
    this.register("keyRepository", (c) => ({
      storeKey: jest.fn().mockResolvedValue(undefined),
      getKey: jest.fn().mockResolvedValue(null),
      storeLookup: jest.fn().mockResolvedValue(undefined),
      lookupKey: jest.fn().mockResolvedValue(null),
      storeHmac: jest.fn().mockResolvedValue(undefined),
      getHmac: jest.fn().mockResolvedValue(null),
      storeRotation: jest.fn().mockResolvedValue(undefined),
      getRotation: jest.fn().mockResolvedValue(null),
      storeIndex: jest.fn().mockResolvedValue(undefined),
      listKeys: jest.fn().mockResolvedValue({
        items: [],
        totalItems: 0,
        limit: 100,
        offset: 0,
      }),
      listKeysWithCursor: jest.fn().mockResolvedValue({
        items: [],
        limit: 100,
        hasMore: false,
        nextCursor: null,
      }),
      deleteMany: jest.fn().mockResolvedValue(undefined),
      storeMany: jest.fn().mockResolvedValue(undefined),
    }));

    // Mock key service
    this.register("keyService", (c) => ({
      createKey: jest.fn().mockResolvedValue({
        id: "test-key-id",
        key: "km_test-key",
        name: "Test Key",
        owner: "test@example.com",
        scopes: ["read:data"],
        status: "active",
        createdAt: 1000000,
        expiresAt: 0,
        lastUsedAt: 0,
      }),
      getKey: jest.fn().mockResolvedValue(null),
      listKeys: jest.fn().mockResolvedValue({
        items: [],
        totalItems: 0,
        limit: 100,
        offset: 0,
      }),
      listKeysWithCursor: jest.fn().mockResolvedValue({
        items: [],
        limit: 100,
        hasMore: false,
        nextCursor: null,
      }),
      revokeKey: jest.fn().mockResolvedValue({
        success: true,
        message: "Key revoked successfully",
      }),
      rotateKey: jest.fn().mockResolvedValue({
        success: true,
        message: "Key rotated successfully",
        originalKey: { id: "test-key-id", status: "rotated" },
        newKey: { id: "new-key-id", key: "km_new-key", status: "active" },
      }),
      validateKey: jest.fn().mockResolvedValue({
        valid: true,
        keyId: "test-key-id",
        scopes: ["read:data"],
      }),
      cleanupExpiredKeys: jest.fn().mockResolvedValue({
        revokedCount: 0,
        staleCount: 0,
        rotationCount: 0,
      }),
    }));

    // Mock auth service
    this.register("authService", (c) => ({
      authenticate: jest.fn().mockResolvedValue({
        authenticated: true,
        admin: {
          keyId: "test-admin-id",
          email: "admin@example.com",
          role: "KEY_ADMIN",
          scopes: ["admin:keys:create", "admin:keys:read", "admin:keys:revoke"],
        },
      }),
      hasPermission: jest.fn().mockReturnValue(true),
      requirePermission: jest.fn(),
      extractAdminInfo: jest.fn().mockReturnValue({
        keyId: "test-admin-id",
        email: "admin@example.com",
        role: "KEY_ADMIN",
        scopes: ["admin:keys:create", "admin:keys:read", "admin:keys:revoke"],
      }),
    }));

    // Mock audit logger
    this.register("auditLogger", (c) => ({
      logAdminAction: jest.fn().mockResolvedValue("test-log-id"),
    }));

    // Mock command bus
    this.register("commandBus", (c) => ({
      execute: jest.fn().mockImplementation(async (command) => {
        if (command.constructor.name === "CreateKeyCommand") {
          return {
            id: "test-key-id",
            key: "km_test-key",
            name: command.name,
            owner: command.owner,
            scopes: command.scopes,
            status: "active",
            createdAt: 1000000,
            expiresAt: command.expiresAt || 0,
            lastUsedAt: 0,
          };
        }

        if (command.constructor.name === "RevokeKeyCommand") {
          return {
            success: true,
            message: "API key revoked successfully",
            id: command.keyId,
            name: "Test Key",
            revokedAt: 1000000,
          };
        }

        return null;
      }),
      registerHandler: jest.fn(),
    }));

    // Mock config
    this.register("config", (c) => ({
      get: jest.fn().mockImplementation((path, defaultValue) => {
        const configValues = {
          "encryption.key": "test-encryption-key",
          "hmac.secret": "test-hmac-secret",
          "keys.prefix": "km_",
          "rateLimit.defaultLimit": 100,
          "security.cors.allowOrigin": "*",
        };

        return configValues[path] || defaultValue;
      }),
      validate: jest.fn(),
      isProduction: jest.fn().mockReturnValue(false),
    }));
  }

  /**
   * Helper methods for tests
   */

  /**
   * Mock a key retrieval
   *
   * @param {string} keyId - Key ID
   * @param {Object} keyData - Key data
   * @returns {TestContainer} This container for chaining
   */
  mockKey(keyId, keyData) {
    this.resolve("keyService").getKey.mockImplementation((id) => {
      if (id === keyId) {
        return Promise.resolve(keyData);
      }
      return Promise.resolve(null);
    });

    return this;
  }

  /**
   * Mock a key lookup
   *
   * @param {string} keyValue - API key value
   * @param {string} keyId - Key ID
   * @returns {TestContainer} This container for chaining
   */
  mockKeyLookup(keyValue, keyId) {
    this.resolve("keyRepository").lookupKey.mockImplementation((value) => {
      if (value === keyValue) {
        return Promise.resolve(keyId);
      }
      return Promise.resolve(null);
    });

    return this;
  }

  /**
   * Mock permission check result
   *
   * @param {boolean} hasPermission - Whether to mock permission as granted
   * @returns {TestContainer} This container for chaining
   */
  mockPermission(hasPermission) {
    this.resolve("authService").hasPermission.mockReturnValue(hasPermission);

    if (!hasPermission) {
      this.resolve("authService").requirePermission.mockImplementation(() => {
        throw new ForbiddenError("You do not have the required permission");
      });
    }

    return this;
  }
}
