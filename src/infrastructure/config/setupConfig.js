import { Config } from "./Config.js";
import { ConfigFactory } from "./ConfigFactory.js";
import fs from 'fs';
import path from 'path';

// Load the schema if available, otherwise use an empty schema
let schema = { components: { schemas: { Config: { type: 'object', properties: {} } } } };
try {
  const schemaPath = path.resolve(process.cwd(), 'schemas', 'config.schema.json');
  if (fs.existsSync(schemaPath)) {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  }
} catch (error) {
  console.warn(`Warning: Could not load schema: ${error.message}`);
}

/**
 * Create and configure the Config instance
 *
 * @param {Object} options - Setup options
 * @param {Object} [options.env] - Environment variables
 * @param {string} [options.configPath] - Path to configuration file
 * @param {boolean} [options.validate] - Whether to validate the configuration
 * @returns {Config} Configured Config instance
 */
export function setupConfig(options = {}) {
  // For backward compatibility - accept just env object
  const env = typeof options === 'object' && !options.env ? options : options.env || {};
  const configPath = options.configPath || env.CONFIG_PATH;
  const shouldValidate = options.validate !== false;
  
  try {
    // Create a config factory
    const factory = new ConfigFactory(schema);
    
    // Create a new config instance using the factory
    const config = factory.create({ 
      env, 
      configPath
    });
    
    // Validate configuration if requested
    if (shouldValidate) {
      try {
        config.validate();
      } catch (error) {
        console.warn(`Configuration warning: ${error.message}`);
      }
    }
    
    return config;
  } catch (error) {
    console.warn(`Warning: Error setting up config with schema: ${error.message}`);
    
    // Fallback to the original Config (for backward compatibility)
    // This should work even without schema since we've improved the Config class
    const config = new Config({}, env);
    
    if (shouldValidate) {
      try {
        config.validate();
      } catch (error) {
        console.warn(`Configuration warning: ${error.message}`);
      }
    }
    
    return config;
  }
}

/**
 * List all available environment variables for configuration
 * Useful for documentation and diagnostics
 * 
 * @returns {Object} Object with categorized environment variables
 */
export function listConfigEnvVars() {
  // Extract config options from schema
  const configSchema = schema.components.schemas.Config;
  const envVars = {
    core: [],
    encryption: [],
    hmac: [],
    keys: [],
    logging: [],
    security: [],
    rateLimit: [],
    routing: [],
    proxy: [],
    maintenance: []
  };
  
  // Process schema properties
  Object.entries(configSchema.properties).forEach(([category, schema]) => {
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([property, propSchema]) => {
        const envKey = `CONFIG_${category.toUpperCase()}_${property.toUpperCase()}`;
        const description = propSchema.description || '';
        const defaultValue = propSchema.default !== undefined ? propSchema.default : null;
        
        if (envVars[category]) {
          envVars[category].push({
            key: envKey,
            description,
            default: defaultValue
          });
        } else {
          envVars.core.push({
            key: envKey,
            description,
            default: defaultValue
          });
        }
        
        // Process nested properties
        if (propSchema.properties) {
          Object.entries(propSchema.properties).forEach(([nestedProp, nestedSchema]) => {
            const nestedEnvKey = `CONFIG_${category.toUpperCase()}_${property.toUpperCase()}_${nestedProp.toUpperCase()}`;
            const nestedDescription = nestedSchema.description || '';
            const nestedDefaultValue = nestedSchema.default !== undefined ? nestedSchema.default : null;
            
            if (envVars[category]) {
              envVars[category].push({
                key: nestedEnvKey,
                description: nestedDescription,
                default: nestedDefaultValue
              });
            }
          });
        }
      });
    }
  });
  
  return envVars;
}
