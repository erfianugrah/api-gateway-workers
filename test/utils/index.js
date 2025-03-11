/**
 * Test utilities for Key Manager Workers
 */
import { TestContainer } from './TestContainer.js';
import { jest } from '@jest/globals';

// Re-export factory functions
export * from './factories.js';

// Re-export mock modules
export * from './mocks/storage.js';
export * from './mocks/services.js';
export * from './mocks/http.js';
export * from './mocks/cloudflare.js';

// Export TestContainer
export { TestContainer };

/**
 * Mock the current date/time
 *
 * @param {number} timestamp - Timestamp to mock
 * @returns {Function} Function to restore the original Date implementation
 */
export function mockTime(timestamp) {
  const originalNow = Date.now;
  Date.now = jest.fn().mockReturnValue(timestamp);
  
  const originalDate = global.Date;
  global.Date = class extends Date {
    constructor(...args) {
      if (args.length === 0) {
        super(timestamp);
      } else {
        super(...args);
      }
    }
    
    static now() {
      return timestamp;
    }
  };
  
  // Return a function to restore the original implementation
  return () => {
    Date.now = originalNow;
    global.Date = originalDate;
  };
}

/**
 * Helper to mock crypto random functions
 * 
 * @param {Object} options - Crypto mocking options
 * @returns {Function} Function to restore original crypto implementation
 */
export function mockCrypto(options = {}) {
  const {
    randomUUID = 'test-uuid-1234',
    randomValues = true,
  } = options;
  
  const originalCrypto = global.crypto;
  
  global.crypto = {
    ...originalCrypto,
    randomUUID: jest.fn().mockReturnValue(randomUUID),
  };
  
  if (randomValues) {
    global.crypto.getRandomValues = jest.fn().mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = (i * 11) % 256; // Deterministic but appears random
      }
      return array;
    });
  }
  
  return () => {
    global.crypto = originalCrypto;
  };
}

/**
 * Setup a test environment with common mocks
 * 
 * @param {Object} options - Setup options
 * @returns {Object} Test setup result with teardown function
 */
export function setupTestEnvironment(options = {}) {
  const {
    mockTimeValue = 1000000,
    mockCryptoOptions = {},
  } = options;
  
  // Setup mocks
  const restoreTime = mockTime(mockTimeValue);
  const restoreCrypto = mockCrypto(mockCryptoOptions);
  
  // Create container with imported TestContainer
  const container = new TestContainer();
  
  // Return setup result
  return {
    container,
    teardown: () => {
      restoreTime();
      restoreCrypto();
      jest.restoreAllMocks();
    }
  };
}