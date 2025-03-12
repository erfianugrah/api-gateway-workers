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
   * @param {boolean} [isProduction=false] - Whether running in production mode
   * @returns {Object} Validation result with isValid and errors properties
   */
  validate(config, isProduction = false) {
    // Extract the Config schema from components
    const configSchema = this.schema.components.schemas.Config;
    
    // Create a basic schema for validation
    const validationSchema = {
      type: 'object',
      properties: configSchema.properties,
      additionalProperties: true
    };
    
    // In production mode, we can't easily enforce nested required fields in AJV,
    // so we'll do custom validation after the standard validation
    
    // Validate using ajv
    const valid = this.ajv.validate(validationSchema, config);
    
    // Get errors from AJV
    const errors = this.ajv.errors || [];
    
    // Custom validation for production requirements
    if (isProduction) {
      // Check for required values in production
      if (!config.encryption || !config.encryption.key) {
        errors.push({
          keyword: 'required',
          dataPath: '.encryption.key',
          message: 'encryption.key is required in production'
        });
      } else if (config.encryption.key.includes('development')) {
        errors.push({
          keyword: 'production',
          dataPath: '.encryption.key',
          message: 'should not use development values in production'
        });
      }
      
      if (!config.hmac || !config.hmac.secret) {
        errors.push({
          keyword: 'required',
          dataPath: '.hmac.secret',
          message: 'hmac.secret is required in production'
        });
      } else if (config.hmac.secret.includes('development')) {
        errors.push({
          keyword: 'production',
          dataPath: '.hmac.secret',
          message: 'should not use development values in production'
        });
      }
    }
    
    return {
      isValid: valid && errors.length === 0,
      errors: errors
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
          if (typeof propSchema.default === 'object' && propSchema.default !== null) {
            targetObj[key] = JSON.parse(JSON.stringify(propSchema.default));
          } else {
            targetObj[key] = propSchema.default;
          }
        }
        
        // Handle objects
        if (propSchema.type === 'object') {
          // Create the object if it doesn't exist
          if (!targetObj[key]) {
            targetObj[key] = {};
          }
          
          // For additionalProperties (like endpoints, services, etc.)
          if (propSchema.additionalProperties && !propSchema.properties) {
            // Initialize with an empty object
            if (targetObj[key] === undefined) {
              targetObj[key] = {};
            }
          }
          
          // If it has defined properties, recurse
          if (propSchema.properties) {
            // Apply defaults to nested objects
            applyDefaultsToObject(propSchema, targetObj[key], currentPath);
          }
        }
        
        // Handle arrays
        if (propSchema.type === 'array' && propSchema.default && targetObj[key] === undefined) {
          targetObj[key] = [...propSchema.default];
        }
      });
    };
    
    // Apply defaults using the Config schema
    const configSchema = this.schema.components.schemas.Config;
    applyDefaultsToObject(configSchema, result);
    
    return result;
  }
}