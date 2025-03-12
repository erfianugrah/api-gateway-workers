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
    
    // Determine if we're in production mode
    const isProduction = this.isProduction(env);
    
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
      
      // Remove CONFIG_ prefix and convert to lowercase with dots
      const configKey = key.substring(7).toLowerCase().replace(/_/g, '.');
      
      // Convert to the appropriate type
      let typedValue = value;
      
      // Try to parse as JSON for complex types
      if (value && (value.startsWith('{') || value.startsWith('[') || 
          value === 'true' || value === 'false' || !isNaN(Number(value)))) {
        try {
          typedValue = JSON.parse(value);
        } catch {
          // If parsing fails, keep as string
          
          // Convert boolean string values
          if (value === 'true') typedValue = true;
          else if (value === 'false') typedValue = false;
          // Convert number string values
          else if (!isNaN(Number(value)) && value.trim() !== '') {
            typedValue = Number(value);
          }
        }
      }
      
      // Set the value in the config
      setValue(config, configKey, typedValue);
    });
    
    // Process special case environment variables for complex objects
    this.processComplexEnvVars(env, config);
    
    // Apply defaults and validate with production flag
    return this.processConfig(config, isProduction);
  }
  
  /**
   * Process special case environment variables for complex objects
   * 
   * @param {Object} env - Environment variables
   * @param {Object} config - Config object being built
   * @private
   */
  processComplexEnvVars(env, config) {
    // Handle proxy services
    const serviceKeys = Object.keys(env).filter(key => 
      key.startsWith('CONFIG_PROXY_SERVICES_') && 
      key.split('_').length > 3
    );
    
    if (serviceKeys.length > 0) {
      // Ensure proxy.services exists
      if (!config.proxy) config.proxy = {};
      if (!config.proxy.services) config.proxy.services = {};
      
      // Group keys by service name
      const serviceGroups = {};
      serviceKeys.forEach(key => {
        // Extract service name and property from key
        // CONFIG_PROXY_SERVICES_USERSERVICE_TARGET -> 'userservice', 'target'
        const parts = key.split('_');
        const serviceName = parts[3].toLowerCase();
        const property = parts.slice(4).join('_').toLowerCase();
        
        if (!serviceGroups[serviceName]) {
          serviceGroups[serviceName] = [];
        }
        serviceGroups[serviceName].push({ key, property });
      });
      
      // Process each service
      Object.keys(serviceGroups).forEach(serviceName => {
        config.proxy.services[serviceName] = {};
        
        serviceGroups[serviceName].forEach(({ key, property }) => {
          let value = env[key];
          
          // Try to parse as JSON for objects like pathRewrite
          try {
            if (value.startsWith('{') || value.startsWith('[')) {
              value = JSON.parse(value);
            } else if (value === 'true') {
              value = true;
            } else if (value === 'false') {
              value = false;
            } else if (!isNaN(Number(value)) && value !== '') {
              value = Number(value);
            }
          } catch {
            // Keep as string if JSON parsing fails
          }
          
          // Set property in lowercase with camelCase
          const camelProperty = property.toLowerCase().replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
          config.proxy.services[serviceName][camelProperty] = value;
        });
      });
    }
    
    // Handle rate limit endpoints
    const rateLimitKeys = Object.keys(env).filter(key => 
      key.startsWith('CONFIG_RATELIMIT_ENDPOINTS_') && 
      key.split('_').length > 3
    );
    
    if (rateLimitKeys.length > 0) {
      // Ensure rateLimit.endpoints exists
      if (!config.rateLimit) config.rateLimit = {};
      if (!config.rateLimit.endpoints) config.rateLimit.endpoints = {};
      
      // Group keys by endpoint path
      const endpointGroups = {};
      rateLimitKeys.forEach(key => {
        // Extract endpoint path and property from key
        // CONFIG_RATELIMIT_ENDPOINTS_API_KEYS_LIMIT -> '/api/keys', 'limit'
        const parts = key.split('_');
        const endpointParts = parts.slice(3, parts.length - 1);
        const endpoint = '/' + endpointParts.join('/').toLowerCase();
        const property = parts[parts.length - 1].toLowerCase();
        
        if (!endpointGroups[endpoint]) {
          endpointGroups[endpoint] = [];
        }
        endpointGroups[endpoint].push({ key, property });
      });
      
      // Process each endpoint
      Object.keys(endpointGroups).forEach(endpoint => {
        config.rateLimit.endpoints[endpoint] = {};
        
        endpointGroups[endpoint].forEach(({ key, property }) => {
          let value = env[key];
          
          // Try to convert to number for limit and window
          if (!isNaN(Number(value)) && value !== '') {
            value = Number(value);
          }
          
          config.rateLimit.endpoints[endpoint][property] = value;
        });
      });
    }
    
    // Handle security headers
    const securityHeaderKeys = Object.keys(env).filter(key => 
      key.startsWith('CONFIG_SECURITY_HEADERS_')
    );
    
    if (securityHeaderKeys.length > 0) {
      // Ensure security.headers exists
      if (!config.security) config.security = {};
      if (!config.security.headers) config.security.headers = {};
      
      securityHeaderKeys.forEach(key => {
        // Extract header name from key
        // CONFIG_SECURITY_HEADERS_X_CONTENT_TYPE_OPTIONS -> 'X-Content-Type-Options'
        const parts = key.split('_');
        const headerParts = parts.slice(3);
        const headerName = headerParts.join('-');
        
        config.security.headers[headerName] = env[key];
      });
    }
  }
  
  /**
   * Load configuration from a file
   *
   * @param {string} filePath - Path to configuration file
   * @param {boolean} [isProduction=false] - Whether running in production mode
   * @returns {Object} Configuration object
   */
  loadFromFile(filePath, isProduction = false) {
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
      
      // Apply defaults and validate with production flag
      return this.processConfig(config, isProduction);
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
    
    // Determine if we're in production mode
    const isProduction = this.isProduction(env);
    
    // Load from file if provided
    if (filePath) {
      try {
        const fileConfig = this.loadFromFile(filePath, isProduction);
        config = this.mergeConfigs(config, fileConfig);
      } catch (error) {
        console.warn(`Warning: ${error.message}`);
      }
    }
    
    // Load from environment variables if provided
    if (env) {
      const envConfig = this.loadFromEnv(env);
      config = this.mergeConfigs(config, envConfig);
    }
    
    // Apply defaults and validate, with production flag
    return this.processConfig(config, isProduction);
  }
  
  /**
   * Deeply merge configuration objects
   * 
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   * @private
   */
  mergeConfigs(target, source) {
    const result = { ...target };
    
    // For each property in source
    Object.keys(source).forEach(key => {
      // If property is an object and not an array
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        // If target doesn't have the property, create it
        if (!result[key] || typeof result[key] !== 'object') {
          result[key] = {};
        }
        // Recursively merge the nested objects
        result[key] = this.mergeConfigs(result[key], source[key]);
      } else {
        // For all other types, just overwrite
        result[key] = source[key];
      }
    });
    
    return result;
  }
  
  /**
   * Process configuration by applying defaults and validating
   *
   * @param {Object} config - Configuration object
   * @param {boolean} [isProduction=false] - Whether running in production mode
   * @returns {Object} Processed configuration object
   * @throws {Error} If validation fails in production mode
   */
  processConfig(config, isProduction = false) {
    // Apply defaults from the schema
    const withDefaults = this.validator.applyDefaults(config);
    
    // Validate the configuration
    const { isValid, errors } = this.validator.validate(withDefaults, isProduction);
    
    // Handle validation errors
    if (!isValid) {
      if (isProduction) {
        // In production, fail with an error for critical validation failures
        const criticalErrors = errors.filter(err => 
          err.dataPath?.includes('encryption.key') || 
          err.dataPath?.includes('hmac.secret') ||
          err.keyword === 'production'
        );
        
        if (criticalErrors.length > 0) {
          throw new Error(`Production configuration validation failed: ${JSON.stringify(criticalErrors)}`);
        }
      }
      
      // Log validation errors 
      console.warn('Configuration validation warnings:', errors);
    }
    
    return withDefaults;
  }
  
  /**
   * Detect if running in production mode
   * 
   * @param {Object} env - Environment variables
   * @returns {boolean} True if running in production
   * @private
   */
  isProduction(env = {}) {
    return env.NODE_ENV === 'production' || 
           env.CONFIG_ENV === 'production';
  }
}