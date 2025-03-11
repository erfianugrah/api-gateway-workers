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
 * @returns {Config} Configured Config instance
 */
export function setupConfig(options = {}) {
  // For backward compatibility - accept just env object
  const env = typeof options === 'object' && !options.env ? options : options.env || {};
  const configPath = options.configPath;
  
  try {
    // Create a config factory
    const factory = new ConfigFactory(schema);
    
    // Create a new config instance using the factory
    const config = factory.create({ env, configPath });
    
    // Validate configuration
    try {
      config.validate();
    } catch (error) {
      console.warn(`Configuration warning: ${error.message}`);
    }
    
    return config;
  } catch (error) {
    console.warn(`Warning: Error setting up config with schema: ${error.message}`);
    
    // Fallback to the original Config (for backward compatibility)
    const config = new Config(env);
    
    try {
      config.validate();
    } catch (error) {
      console.warn(`Configuration warning: ${error.message}`);
    }
    
    return config;
  }
}
