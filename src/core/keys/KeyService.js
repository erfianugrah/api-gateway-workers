/**
 * Service interface for API key operations
 * @interface
 */
export class KeyService {
  /**
   * Create a new API key
   *
   * @param {Object} keyData - Key creation data
   * @param {string} keyData.name - Human-readable name for the key
   * @param {string} keyData.owner - Owner of the key
   * @param {string[]} keyData.scopes - Permission scopes
   * @param {number} [keyData.expiresAt] - Expiration timestamp (0 for no expiration)
   * @param {string} [keyData.createdBy] - ID of admin who created this key
   * @param {Object} [keyData.metadata] - Additional metadata
   * @returns {Promise<Object>} Created key with key value
   */
  async createKey(keyData) {
    throw new Error("Method not implemented");
  }

  /**
   * Get a key by ID
   *
   * @param {string} keyId - Key ID
   * @returns {Promise<Object|null>} Key data or null if not found
   */
  async getKey(keyId) {
    throw new Error("Method not implemented");
  }

  /**
   * List keys with pagination
   *
   * @param {Object} options - List options
   * @param {number} options.limit - Maximum keys to return
   * @param {number} options.offset - Number of keys to skip
   * @returns {Promise<Object>} Paginated key list
   */
  async listKeys(options = {}) {
    throw new Error("Method not implemented");
  }

  /**
   * List keys with cursor-based pagination
   *
   * @param {Object} options - List options
   * @param {number} options.limit - Maximum keys to return
   * @param {string} options.cursor - Pagination cursor
   * @param {boolean} options.includeRotated - Whether to include rotated keys
   * @returns {Promise<Object>} Paginated key list with cursor
   */
  async listKeysWithCursor(options = {}) {
    throw new Error("Method not implemented");
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
    throw new Error("Method not implemented");
  }

  /**
   * Rotate an API key (create new while maintaining grace period for old)
   *
   * @param {string} keyId - Key ID to rotate
   * @param {Object} options - Rotation options
   * @param {number} [options.gracePeriodDays] - Days for grace period
   * @param {string[]} [options.scopes] - Updated scopes for new key
   * @param {string} [options.name] - Updated name for new key
   * @param {number} [options.expiresAt] - Updated expiration for new key
   * @param {string} [options.rotatedBy] - ID of admin who rotated the key
   * @returns {Promise<Object>} Rotation result with new key
   */
  async rotateKey(keyId, options = {}) {
    throw new Error("Method not implemented");
  }

  /**
   * Validate an API key
   *
   * @param {string} apiKey - The API key to validate
   * @param {string[]} [requiredScopes] - Optional scopes to check
   * @returns {Promise<Object>} Validation result
   */
  async validateKey(apiKey, requiredScopes = []) {
    throw new Error("Method not implemented");
  }

  /**
   * Clean up expired keys and stale data
   *
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupExpiredKeys() {
    throw new Error("Method not implemented");
  }
}
