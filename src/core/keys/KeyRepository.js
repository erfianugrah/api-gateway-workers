/**
 * Repository interface for API key storage operations
 * @interface
 */
export class KeyRepository {
  /**
   * Store an API key
   *
   * @param {string} id - Key ID
   * @param {Object} keyData - Key data to store
   * @returns {Promise<void>}
   */
  async storeKey(id, keyData) {
    throw new Error("Method not implemented");
  }

  /**
   * Retrieve an API key by ID
   *
   * @param {string} id - Key ID
   * @returns {Promise<Object|null>} The key data or null if not found
   */
  async getKey(id) {
    throw new Error("Method not implemented");
  }

  /**
   * Store a lookup entry from API key value to ID
   *
   * @param {string} keyValue - API key value
   * @param {string} keyId - Key ID
   * @returns {Promise<void>}
   */
  async storeLookup(keyValue, keyId) {
    throw new Error("Method not implemented");
  }

  /**
   * Look up a key ID by API key value
   *
   * @param {string} keyValue - API key value
   * @returns {Promise<string|null>} Key ID or null if not found
   */
  async lookupKey(keyValue) {
    throw new Error("Method not implemented");
  }

  /**
   * Store HMAC signature for an API key
   *
   * @param {string} keyValue - API key value
   * @param {string} hmac - HMAC signature
   * @returns {Promise<void>}
   */
  async storeHmac(keyValue, hmac) {
    throw new Error("Method not implemented");
  }

  /**
   * Get HMAC signature for an API key
   *
   * @param {string} keyValue - API key value
   * @returns {Promise<string|null>} HMAC signature or null if not found
   */
  async getHmac(keyValue) {
    throw new Error("Method not implemented");
  }

  /**
   * Store rotation information
   *
   * @param {string} keyId - Original key ID
   * @param {Object} rotationInfo - Rotation information
   * @returns {Promise<void>}
   */
  async storeRotation(keyId, rotationInfo) {
    throw new Error("Method not implemented");
  }

  /**
   * Get rotation information
   *
   * @param {string} keyId - Key ID
   * @returns {Promise<Object|null>} Rotation info or null if not found
   */
  async getRotation(keyId) {
    throw new Error("Method not implemented");
  }

  /**
   * Store indexing information for efficient listing
   *
   * @param {string} keyId - Key ID
   * @param {number} timestamp - Creation timestamp
   * @returns {Promise<void>}
   */
  async storeIndex(keyId, timestamp) {
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
   * Delete items using a transaction
   *
   * @param {string[]} keys - Keys to delete
   * @returns {Promise<void>}
   */
  async deleteMany(keys) {
    throw new Error("Method not implemented");
  }

  /**
   * Store multiple items using a transaction
   *
   * @param {Object} items - Map of key-value pairs to store
   * @returns {Promise<void>}
   */
  async storeMany(items) {
    throw new Error("Method not implemented");
  }
}
