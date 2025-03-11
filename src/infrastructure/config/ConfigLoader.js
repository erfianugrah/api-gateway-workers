import { SchemaValidator } from './SchemaValidator.js';
import fs from 'fs';
import path from 'path';

/**
 * Config loader for loading and validating configuration
 */
export class ConfigLoader {
  /**
   * Create a new config loader
   *
   * @param {Object} schema - JSON Schema to validate against
   */
  constructor(schema) {
    this.schema = schema;
    this.validator = new SchemaValidator(schema);
  }
  
  /**
   * Load configuration from environment variables
   *
   * @param {Object} env - Environment variables
   * @returns {Object} Configuration object
   */
  loadFromEnv(env = {}) {
    // Start with an empty config
    const config = {};
    
    // Helper function to create nested objects from dot notation
    const setValue = (obj, path, value) => {
      const parts = path.split('.');
      let current = obj;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = value;
    };
    
    // Map environment variables to config properties
    Object.entries(env).forEach(([key, value]) => {
      // Skip non-configuration variables
      if (!key.startsWith('CONFIG_')) return;
      
      // Remove CONFIG_ prefix and convert to lowercase
      const configKey = key.substring(7).toLowerCase();
      
      // Convert to the appropriate type
      let typedValue = value;
      
      // Try to parse as JSON for complex types
      if (value && (value.startsWith('{') || value.startsWith('[') || 
          value === 'true' || value === 'false' || !isNaN(Number(value)))) {
        try {
          typedValue = JSON.parse(value);
        } catch {
          // If parsing fails, keep as string
        }
      }
      
      // Set the value in the config
      setValue(config, configKey, typedValue);
    });
    
    // Apply defaults and validate
    return this.processConfig(config);
  }
  
  /**
   * Load configuration from a file
   *
   * @param {string} filePath - Path to configuration file
   * @returns {Object} Configuration object
   */
  loadFromFile(filePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Configuration file not found: ${filePath}`);
      }
      
      // Read and parse file
      const content = fs.readFileSync(filePath, 'utf8');
      const extension = path.extname(filePath).toLowerCase();
      
      let config;
      if (extension === '.json') {
        config = JSON.parse(content);
      } else {
        throw new Error(`Unsupported configuration file type: ${extension}`);
      }
      
      // Apply defaults and validate
      return this.processConfig(config);
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }
  
  /**
   * Load configuration from multiple sources
   *
   * @param {Object} options - Configuration options
   * @param {Object} [options.env] - Environment variables
   * @param {string} [options.filePath] - Path to configuration file
   * @param {Object} [options.defaults] - Default configuration
   * @returns {Object} Merged configuration object
   */
  load({ env, filePath, defaults = {} } = {}) {
    let config = { ...defaults };
    
    // Load from file if provided
    if (filePath) {
      try {
        const fileConfig = this.loadFromFile(filePath);
        config = { ...config, ...fileConfig };
      } catch (error) {
        console.warn(`Warning: ${error.message}`);
      }
    }
    
    // Load from environment variables if provided
    if (env) {
      const envConfig = this.loadFromEnv(env);
      config = { ...config, ...envConfig };
    }
    
    // Apply defaults and validate
    return this.processConfig(config);
  }
  
  /**
   * Process configuration by applying defaults and validating
   *
   * @param {Object} config - Configuration object
   * @returns {Object} Processed configuration object
   */
  processConfig(config) {
    // Apply defaults from the schema
    const withDefaults = this.validator.applyDefaults(config);
    
    // Validate the configuration
    const { isValid, errors } = this.validator.validate(withDefaults);
    
    // Log validation errors but don't fail
    if (!isValid) {
      console.warn('Configuration validation errors:', errors);
    }
    
    return withDefaults;
  }
}