import { generateApiKey } from "../../utils/security.js";

/**
 * Service for generating API keys
 */
export class KeyGenerator {
  /**
   * Create a new KeyGenerator
   *
   * @param {string} prefix - Prefix for API keys
   */
  constructor(prefix = "km_") {
    this.prefix = prefix;
  }

  /**
   * Generate a new API key
   *
   * @returns {string} Generated API key
   */
  generateKey() {
    return generateApiKey(this.prefix);
  }
}
