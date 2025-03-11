import { jest } from '@jest/globals';
import { ConfigFactory } from '../../../src/infrastructure/config/ConfigFactory.js';
import { Config } from '../../../src/infrastructure/config/Config.js';

describe('ConfigFactory Integration', () => {
  // Create a simple schema
  const schema = {
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
  };

  test('should create a Config instance', () => {
    const factory = new ConfigFactory(schema);
    const env = { CONFIG_TEST_VALUE: 'test-value' };
    
    // Create a Config instance
    const config = factory.create({ env });
    
    // Verify instance type
    expect(config).toBeInstanceOf(Config);
  });
});