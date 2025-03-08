import { KeyService } from "../KeyService.js";
import { NotFoundError } from "../../errors/ApiError.js";

/**
 * Adapter to make existing ApiKeyManager compatible with KeyService interface
 */
export class KeyServiceAdapter extends KeyService {
  /**
   * Create a new KeyServiceAdapter
   *
   * @param {ApiKeyManager} apiKeyManager - Existing ApiKeyManager instance
   */
  constructor(apiKeyManager) {
    super();
    this.apiKeyManager = apiKeyManager;
  }

  /**
   * Create a new API key
   *
   * @param {Object} keyData - Key creation data
   * @returns {Promise<Object>} Created key with key value
   */
  async createKey(keyData) {
    try {
      return await this.apiKeyManager.createKey(keyData);
    } catch (error) {
      // Convert to standardized errors
      if (error.message.includes("Invalid key data")) {
        throw new ValidationError("Invalid key data", {
          general: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Get a key by ID
   *
   * @param {string} keyId - Key ID
   * @returns {Promise<Object|null>} Key data or null if not found
   */
  async getKey(keyId) {
    const key = await this.apiKeyManager.getKey(keyId);
    return key;
  }

  /**
   * List keys with pagination
   *
   * @param {Object} options - List options
   * @returns {Promise<Object>} Paginated key list
   */
  async listKeys(options = {}) {
    return await this.apiKeyManager.listKeys(options);
  }

  /**
   * List keys with cursor-based pagination
   *
   * @param {Object} options - List options
   * @returns {Promise<Object>} Paginated key list with cursor
   */
  async listKeysWithCursor(options = {}) {
    return await this.apiKeyManager.listKeysWithCursor(options);
  }

  /**
   * Revoke an API key
   *
   * @param {string} keyId - Key ID to revoke
   * @param {string} [reason] - Reason for revocation
   * @param {string} [revokedBy] - ID of admin who revoked the key
   * @returns {Promise<Object>} Revocation result
   */
  async revokeKey(keyId, reason, revokedBy) {
    const result = await this.apiKeyManager.revokeKey(keyId);

    if (!result.success && result.error === "API key not found") {
      throw new NotFoundError("API key", keyId);
    }

    return result;
  }

  /**
   * Rotate an API key
   *
   * @param {string} keyId - Key ID to rotate
   * @param {Object} options - Rotation options
   * @returns {Promise<Object>} Rotation result with new key
   */
  async rotateKey(keyId, options = {}) {
    const result = await this.apiKeyManager.rotateKey(keyId, options);

    if (!result.success && result.error === "API key not found") {
      throw new NotFoundError("API key", keyId);
    }

    return result;
  }

  /**
   * Validate an API key
   *
   * @param {string} apiKey - The API key to validate
   * @param {string[]} [requiredScopes] - Optional scopes to check
   * @returns {Promise<Object>} Validation result
   */
  async validateKey(apiKey, requiredScopes = []) {
    return await this.apiKeyManager.validateKey(apiKey, requiredScopes);
  }

  /**
   * Clean up expired keys and stale data
   *
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupExpiredKeys() {
    return await this.apiKeyManager.cleanupExpiredKeys();
  }
}
