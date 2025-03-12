/**
 * Mock storage implementations for testing
 */
import { jest } from "@jest/globals";

/**
 * Create a mock storage implementation
 *
 * @returns {Object} Mock storage object
 */
export function createMockStorage() {
  return {
    get: jest.fn().mockResolvedValue(null),
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue(new Map()),
    transaction: jest.fn(() => ({
      put: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    })),
  };
}

/**
 * Create a mock durable object state
 *
 * @returns {Object} Mock durable object state
 */
export function createMockDurableObjectState() {
  const storage = createMockStorage();

  return {
    storage,
    blockConcurrencyWhile: jest.fn((callback) => callback()),
  };
}

/**
 * Create a mock key repository
 *
 * @returns {Object} Mock key repository
 */
export function createMockKeyRepository() {
  return {
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
  };
}
