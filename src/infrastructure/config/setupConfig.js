import { Config } from "./Config.js";

/**
 * Create and configure the Config instance
 *
 * @param {Object} env - Environment variables
 * @returns {Config} Configured Config instance
 */
export function setupConfig(env) {
  const config = new Config(env);

  // Validate configuration
  try {
    config.validate();
  } catch (error) {
    console.warn(`Configuration warning: ${error.message}`);
  }

  return config;
}
