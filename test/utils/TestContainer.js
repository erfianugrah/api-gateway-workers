import { Container } from "../../src/infrastructure/di/Container.js";
import { ForbiddenError } from "../../src/core/errors/ApiError.js";
import { 
  createMockStorage, 
  createMockKeyRepository 
} from './mocks/storage.js';
import { 
  createMockKeyService, 
  createMockAuthService, 
  createMockCommandBus,
  createMockConfig,
  createMockAuditLogger
} from './mocks/services.js';

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
    // Register mocks using our mock factory functions
    this.register("storage", () => createMockStorage());
    this.register("keyRepository", () => createMockKeyRepository());
    this.register("keyService", () => createMockKeyService());
    this.register("authService", () => createMockAuthService());
    this.register("auditLogger", () => createMockAuditLogger());
    this.register("commandBus", () => createMockCommandBus());
    this.register("config", () => createMockConfig());
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
      this.resolve("authService").requirePermission.mockImplementation((admin, permission) => {
        throw new ForbiddenError(`You do not have permission: ${permission}`, permission);
      });
    }

    return this;
  }
}
