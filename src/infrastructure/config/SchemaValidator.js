import Ajv from 'ajv';

/**
 * Schema validator for configuration
 */
export class SchemaValidator {
  /**
   * Create a new schema validator
   *
   * @param {Object} schema - JSON Schema to validate against
   */
  constructor(schema) {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      useDefaults: true
    });
    
    // Add the schema
    this.schema = schema;
    this.ajv.addSchema(schema, 'config');
  }
  
  /**
   * Validate configuration object against schema
   *
   * @param {Object} config - Configuration object to validate
   * @returns {Object} Validation result with isValid and errors properties
   */
  validate(config) {
    // Extract the Config schema from components
    const configSchema = this.schema.components.schemas.Config;
    
    // Create a basic schema for validation
    const validationSchema = {
      type: 'object',
      properties: configSchema.properties,
      additionalProperties: true
    };
    
    // Validate using ajv
    const valid = this.ajv.validate(validationSchema, config);
    
    return {
      isValid: valid,
      errors: this.ajv.errors || []
    };
  }
  
  /**
   * Apply defaults from schema to config object
   *
   * @param {Object} config - Configuration object to apply defaults to
   * @returns {Object} Configuration with defaults applied
   */
  applyDefaults(config) {
    // Start with a copy of the config
    const result = JSON.parse(JSON.stringify(config));
    
    // Helper function to recursively apply defaults
    const applyDefaultsToObject = (schema, targetObj, path = '') => {
      if (!schema || !schema.properties) return;
      
      // For each property in the schema
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        const currentPath = path ? `${path}.${key}` : key;
        
        // If property doesn't exist in target, but has a default in schema
        if (targetObj[key] === undefined && propSchema.default !== undefined) {
          targetObj[key] = JSON.parse(JSON.stringify(propSchema.default));
        }
        
        // If it's an object, recurse
        if (propSchema.type === 'object' && propSchema.properties) {
          // Create the object if it doesn't exist
          if (!targetObj[key]) {
            targetObj[key] = {};
          }
          
          // Apply defaults to nested objects
          applyDefaultsToObject(propSchema, targetObj[key], currentPath);
        }
      });
    };
    
    // Apply defaults using the Config schema
    const configSchema = this.schema.components.schemas.Config;
    applyDefaultsToObject(configSchema, result);
    
    return result;
  }
}