/**
 * Tests for setupConfig.js
 */
import { jest } from '@jest/globals';
import { setupConfig } from '../../../src/infrastructure/config/setupConfig.js';
import { Config } from '../../../src/infrastructure/config/Config.js';

// Mock dependencies to avoid filesystem operations
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn(() => JSON.stringify({
    components: {
      schemas: {
        Config: {
          type: 'object',
          properties: {
            test: {
              type: 'object',
              properties: {
                value: {
                  type: 'string',
                  default: 'default-value'
                }
              }
            }
          }
        }
      }
    }
  }))
}));

jest.mock('path', () => ({
  resolve: jest.fn((...args) => args.join('/'))
}));

// Silence console warnings
console.warn = jest.fn();

describe('setupConfig', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  test('should create a Config instance from environment', () => {
    const env = { CONFIG_TEST_VALUE: 'test-value' };
    const config = setupConfig({ env });
    
    // Verify it's a Config instance
    expect(config).toBeDefined();
    expect(config.constructor.name).toBe('Config');
  });

  test('should handle direct env object for backward compatibility', () => {
    const env = { CONFIG_TEST_VALUE: 'test-value' };
    const config = setupConfig(env);
    
    // Verify it's a Config instance
    expect(config).toBeDefined();
    expect(config.constructor.name).toBe('Config');
  });

  test('should handle schema loading failure gracefully', () => {
    // Make schema loading fail
    const existsSyncMock = jest.requireMock('fs').existsSync;
    existsSyncMock.mockReturnValueOnce(false);
    
    const env = { CONFIG_TEST_VALUE: 'test-value' };
    const config = setupConfig({ env });
    
    // Should still create a Config
    expect(config).toBeDefined();
    expect(config.constructor.name).toBe('Config');
  });
});