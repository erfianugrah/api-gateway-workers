import { KeyRepository } from "../../core/keys/KeyRepository.js";
import {
  decodeCursor,
  encodeCursor,
  getHmacStorageId,
  getKeyIndexEntry,
  getKeyStorageId,
  getLookupStorageId,
  getRotationStorageId,
  STORAGE_PREFIXES,
} from "../../utils/storage.js";

/**
 * Durable Object implementation of KeyRepository
 */
export class DurableObjectRepository extends KeyRepository {
  /**
   * Create a new DurableObjectRepository
   *
   * @param {DurableObjectStorage} storage - Durable Object storage
   */
  constructor(storage) {
    super();
    this.storage = storage;
  }

  /**
   * Store an API key
   *
   * @param {string} id - Key ID
   * @param {Object} keyData - Key data to store
   * @returns {Promise<void>}
   */
  async storeKey(id, keyData) {
    await this.storage.put(getKeyStorageId(id), keyData);
  }

  /**
   * Retrieve an API key by ID
   *
   * @param {string} id - Key ID
   * @returns {Promise<Object|null>} The key data or null if not found
   */
  async getKey(id) {
    return await this.storage.get(getKeyStorageId(id));
  }

  /**
   * Store a lookup entry from API key value to ID
   *
   * @param {string} keyValue - API key value
   * @param {string} keyId - Key ID
   * @returns {Promise<void>}
   */
  async storeLookup(keyValue, keyId) {
    await this.storage.put(getLookupStorageId(keyValue), keyId);
  }

  /**
   * Look up a key ID by API key value
   *
   * @param {string} keyValue - API key value
   * @returns {Promise<string|null>} Key ID or null if not found
   */
  async lookupKey(keyValue) {
    return await this.storage.get(getLookupStorageId(keyValue));
  }

  /**
   * Store HMAC signature for an API key
   *
   * @param {string} keyValue - API key value
   * @param {string} hmac - HMAC signature
   * @returns {Promise<void>}
   */
  async storeHmac(keyValue, hmac) {
    await this.storage.put(getHmacStorageId(keyValue), hmac);
  }

  /**
   * Get HMAC signature for an API key
   *
   * @param {string} keyValue - API key value
   * @returns {Promise<string|null>} HMAC signature or null if not found
   */
  async getHmac(keyValue) {
    return await this.storage.get(getHmacStorageId(keyValue));
  }

  /**
   * Store rotation information
   *
   * @param {string} keyId - Original key ID
   * @param {Object} rotationInfo - Rotation information
   * @returns {Promise<void>}
   */
  async storeRotation(keyId, rotationInfo) {
    await this.storage.put(getRotationStorageId(keyId), rotationInfo);
  }

  /**
   * Get rotation information
   *
   * @param {string} keyId - Key ID
   * @returns {Promise<Object|null>} Rotation info or null if not found
   */
  async getRotation(keyId) {
    return await this.storage.get(getRotationStorageId(keyId));
  }

  /**
   * Store indexing information for efficient listing
   *
   * @param {string} keyId - Key ID
   * @param {number} timestamp - Creation timestamp
   * @returns {Promise<void>}
   */
  async storeIndex(keyId, timestamp) {
    await this.storage.put(getKeyIndexEntry(keyId, timestamp), keyId);
  }

  /**
   * List keys with pagination
   *
   * @param {Object} options - List options
   * @param {number} options.limit - Maximum keys to return
   * @param {number} options.offset - Number of keys to skip
   * @returns {Promise<Object>} Paginated key list
   */
  async listKeys({ limit = 100, offset = 0 } = {}) {
    // Get all keys (we'll handle pagination in memory)
    const keys = await this.storage.list({ prefix: STORAGE_PREFIXES.KEY });
    const totalKeys = keys.size;

    // Convert to array for pagination
    let keyArray = [...keys.entries()];

    // Sort by creation date (newest first)
    keyArray.sort((a, b) => b[1].createdAt - a[1].createdAt);

    // Apply offset and limit
    keyArray = keyArray.slice(offset, offset + limit);

    // Process the paginated results
    const items = keyArray.map(([_, value]) => {
      // Create a safe copy without sensitive data
      const safeKey = { ...value };
      delete safeKey.encryptedKey; // Remove sensitive data
      return safeKey;
    });

    return {
      items,
      totalItems: totalKeys,
      limit,
      offset,
    };
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
  async listKeysWithCursor(
    { limit = 100, cursor = null, includeRotated = false } = {},
  ) {
    let startAfter = null;

    // Decode cursor if provided
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (cursorData && cursorData.id && cursorData.ts) {
        startAfter = getKeyIndexEntry(cursorData.id, cursorData.ts);
      }
    }

    // Query the index entries for pagination
    const indexEntries = await this.storage.list({
      prefix: STORAGE_PREFIXES.KEY_INDEX,
      start: startAfter ? startAfter + "\0" : undefined, // Start after the last seen key
      limit: limit + 1, // Fetch one extra to determine if there are more results
    });

    // Check if we have more entries beyond the requested limit
    const hasMore = indexEntries.size > limit;

    // Get the actual entries up to the limit
    const entryArray = [...indexEntries.entries()].slice(0, limit);

    // Fetch the actual API keys based on the index entries
    const keyPromises = entryArray.map(async ([indexKey, keyId]) => {
      const apiKey = await this.getKey(keyId);

      if (!apiKey) {
        return null; // Key might have been deleted
      }

      // Skip rotated keys if includeRotated is false
      if (!includeRotated && apiKey.status === "rotated") {
        return null;
      }

      // Create a safe copy without sensitive data
      const safeKey = { ...apiKey };
      delete safeKey.encryptedKey; // Remove sensitive data
      return safeKey;
    });

    // Wait for all promises to resolve
    const keys = (await Promise.all(keyPromises)).filter((key) => key !== null);

    // Generate next cursor if we have more results
    let nextCursor = null;
    if (hasMore && entryArray.length > 0) {
      const lastEntry = entryArray[entryArray.length - 1];
      const lastKeyId = lastEntry[1];
      const lastKey = await this.getKey(lastKeyId);
      const lastTimestamp = lastKey ? lastKey.createdAt : Date.now();
      nextCursor = encodeCursor(lastKeyId, lastTimestamp);
    }

    return {
      items: keys,
      limit,
      hasMore,
      nextCursor,
    };
  }

  /**
   * Delete items using a transaction
   *
   * @param {string[]} keys - Keys to delete
   * @returns {Promise<void>}
   */
  async deleteMany(keys) {
    // Use transaction if available
    if (typeof this.storage.transaction === "function") {
      const tx = this.storage.transaction();

      for (const key of keys) {
        tx.delete(key);
      }

      await tx.commit();
    } else {
      // Fallback if transactions aren't available
      for (const key of keys) {
        await this.storage.delete(key);
      }
    }
  }

  /**
   * Store multiple items using a transaction
   *
   * @param {Object} items - Map of key-value pairs to store
   * @returns {Promise<void>}
   */
  async storeMany(items) {
    // Use transaction if available
    if (typeof this.storage.transaction === "function") {
      const tx = this.storage.transaction();

      for (const [key, value] of Object.entries(items)) {
        tx.put(key, value);
      }

      await tx.commit();
    } else {
      // Fallback if transactions aren't available
      for (const [key, value] of Object.entries(items)) {
        await this.storage.put(key, value);
      }
    }
  }
}
