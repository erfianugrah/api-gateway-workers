/**
 * Mock service implementations for testing
 */
import { createTestKey, createTestAdmin } from '../factories.js';

/**
 * Create a mock key service
 *
 * @returns {Object} Mock key service
 */
export function createMockKeyService() {
  return {
    createKey: jest.fn().mockResolvedValue(createTestKey()),
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
  };
}

/**
 * Create a mock auth service
 *
 * @param {Object} options - Auth service options
 * @returns {Object} Mock auth service
 */
export function createMockAuthService(options = {}) {
  const { permissionGranted = true } = options;
  const admin = createTestAdmin();

  return {
    authenticate: jest.fn().mockResolvedValue({
      authenticated: true,
      admin,
    }),
    hasPermission: jest.fn().mockReturnValue(permissionGranted),
    requirePermission: jest.fn().mockImplementation((adminObj, permission) => {
      if (!permissionGranted) {
        throw new Error(`Permission denied: ${permission}`);
      }
    }),
    extractAdminInfo: jest.fn().mockReturnValue(admin),
  };
}

/**
 * Create a mock command bus
 *
 * @returns {Object} Mock command bus
 */
export function createMockCommandBus() {
  return {
    execute: jest.fn().mockImplementation(async (command) => {
      if (command.constructor.name === "CreateKeyCommand") {
        return createTestKey({
          name: command.name,
          owner: command.owner,
          scopes: command.scopes,
          expiresAt: command.expiresAt || 0,
        });
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
  };
}

/**
 * Create a mock config service
 *
 * @param {Object} configValues - Config values to use 
 * @returns {Object} Mock config service
 */
export function createMockConfig(configValues = {}) {
  const defaultValues = {
    "encryption.key": "test-encryption-key",
    "hmac.secret": "test-hmac-secret",
    "keys.prefix": "km_",
    "rateLimit.defaultLimit": 100,
    "security.cors.allowOrigin": "*",
  };

  const mergedValues = { ...defaultValues, ...configValues };

  return {
    get: jest.fn().mockImplementation((path, defaultValue) => {
      return mergedValues[path] !== undefined ? mergedValues[path] : defaultValue;
    }),
    validate: jest.fn(),
    isProduction: jest.fn().mockReturnValue(false),
  };
}

/**
 * Create a mock audit logger
 *
 * @returns {Object} Mock audit logger
 */
export function createMockAuditLogger() {
  return {
    logAdminAction: jest.fn().mockResolvedValue("test-log-id"),
  };
}