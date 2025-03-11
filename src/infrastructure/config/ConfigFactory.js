import { Config } from './Config.js';
import { ConfigLoader } from './ConfigLoader.js';
import fs from 'fs';
import path from 'path';

/**
 * Factory for creating Config instances
 */
export class ConfigFactory {
  /**
   * Create a new ConfigFactory
   * 
   * @param {Object} schema - OpenAPI schema
   */
  constructor(schema) {
    this.schema = schema;
    this.loader = new ConfigLoader(schema);
  }
  
  /**
   * Create a new Config instance
   * 
   * @param {Object} options - Config options
   * @param {Object} [options.env] - Environment variables
   * @param {string} [options.configPath] - Path to config file
   * @returns {Config} Config instance
   */
  create({ env = {}, configPath } = {}) {
    // Try to load config file path from environment if not provided
    const filePath = configPath || env.CONFIG_PATH;
    
    // Load configuration data from all sources
    const configData = this.loader.load({
      env,
      filePath,
      defaults: {}
    });
    
    // Create and return a new Config instance
    return new Config(configData, env);
  }
  
  /**
   * Get available configuration paths
   * 
   * @returns {string[]} Array of available configuration file paths
   */
  getAvailableConfigPaths() {
    const paths = [];
    
    // Check common locations for config files
    const locations = [
      // Current directory
      path.resolve(process.cwd(), 'config.json'),
      path.resolve(process.cwd(), 'api-gateway.config.json'),
      
      // Config directory
      path.resolve(process.cwd(), 'config', 'config.json'),
      path.resolve(process.cwd(), 'config', 'api-gateway.config.json'),
      
      // Home directory
      path.resolve(process.env.HOME || process.env.USERPROFILE || '', '.api-gateway', 'config.json')
    ];
    
    // Add any paths that exist
    for (const location of locations) {
      if (fs.existsSync(location)) {
        paths.push(location);
      }
    }
    
    return paths;
  }
}