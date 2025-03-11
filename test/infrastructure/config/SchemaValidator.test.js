import { jest } from '@jest/globals';
import { SchemaValidator } from '../../../src/infrastructure/config/SchemaValidator.js';

describe('SchemaValidator', () => {
  let schema;
  
  beforeEach(() => {
    // Sample schema for testing
    schema = {
      components: {
        schemas: {
          Config: {
            type: 'object',
            properties: {
              test: {
                type: 'object',
                properties: {
                  stringProp: {
                    type: 'string',
                    default: 'default-value'
                  },
                  numberProp: {
                    type: 'integer',
                    default: 42
                  },
                  boolProp: {
                    type: 'boolean',
                    default: true
                  },
                  objectProp: {
                    type: 'object',
                    properties: {
                      nestedProp: {
                        type: 'string',
                        default: 'nested-default'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  });
  
  test('should create a validator with schema', () => {
    const validator = new SchemaValidator(schema);
    expect(validator).toBeDefined();
    expect(validator.schema).toBe(schema);
  });
  
  test('should validate config against schema', () => {
    const validator = new SchemaValidator(schema);
    const config = {
      test: {
        stringProp: 'test-value',
        numberProp: 123,
        boolProp: false
      }
    };
    
    const result = validator.validate(config);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
  
  test('should detect validation errors', () => {
    const validator = new SchemaValidator(schema);
    const config = {
      test: {
        stringProp: 42, // Should be a string
        numberProp: 'not-a-number', // Should be a number
        boolProp: 'not-a-boolean' // Should be a boolean
      }
    };
    
    const result = validator.validate(config);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
  
  test('should apply defaults to config', () => {
    const validator = new SchemaValidator(schema);
    const config = {
      test: {
        // No properties set, should get defaults
      }
    };
    
    const result = validator.applyDefaults(config);
    expect(result.test.stringProp).toBe('default-value');
    expect(result.test.numberProp).toBe(42);
    expect(result.test.boolProp).toBe(true);
    expect(result.test.objectProp.nestedProp).toBe('nested-default');
  });
  
  test('should not override existing values when applying defaults', () => {
    const validator = new SchemaValidator(schema);
    const config = {
      test: {
        stringProp: 'custom-value',
        numberProp: 100
      }
    };
    
    const result = validator.applyDefaults(config);
    expect(result.test.stringProp).toBe('custom-value');
    expect(result.test.numberProp).toBe(100);
    expect(result.test.boolProp).toBe(true); // Default applied
  });
  
  test('should handle nested objects when applying defaults', () => {
    const validator = new SchemaValidator(schema);
    const config = {
      test: {
        objectProp: {
          // nestedProp not set, should get default
        }
      }
    };
    
    const result = validator.applyDefaults(config);
    expect(result.test.objectProp.nestedProp).toBe('nested-default');
  });
});