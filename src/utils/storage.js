/**
 * Constants for storage prefixes to avoid typos and enable easier changes
 * @type {Object}
 */
export const STORAGE_PREFIXES = {
  KEY: "key:",
  KEY_INDEX: "keyindex:",
  LOOKUP: "lookup:",
  HMAC: "hmac:",
  RATE: "rate:",
  ROTATION: "rotation:",
};

/**
 * Helper function to generate a storage key for an API key
 * @param {string} id - The API key ID
 * @returns {string} The storage key
 */
export function getKeyStorageId(id) {
  return `${STORAGE_PREFIXES.KEY}${id}`;
}

/**
 * Helper function to generate a lookup key for an API key
 * @param {string} key - The API key value
 * @returns {string} The lookup key
 */
export function getLookupStorageId(key) {
  return `${STORAGE_PREFIXES.LOOKUP}${key}`;
}

/**
 * Helper function to generate an HMAC storage key for an API key
 * @param {string} key - The API key value
 * @returns {string} The HMAC storage key
 */
export function getHmacStorageId(key) {
  return `${STORAGE_PREFIXES.HMAC}${key}`;
}

/**
 * Helper function to generate a key index entry for sorting by creation time
 * Format ensures proper sorting: timestamp_keyId
 * @param {string} id - The API key ID
 * @param {number} timestamp - Creation timestamp
 * @returns {string} The key index entry
 */
export function getKeyIndexEntry(id, timestamp) {
  // Pad timestamp to ensure proper string sorting (20 digits for the year 9999)
  const paddedTimestamp = timestamp.toString().padStart(20, "0");

  return `${STORAGE_PREFIXES.KEY_INDEX}${paddedTimestamp}_${id}`;
}

/**
 * Extract key ID from a key index entry
 * @param {string} indexEntry - The key index entry
 * @returns {string|null} The key ID or null if invalid format
 */
export function getKeyIdFromIndexEntry(indexEntry) {
  if (!indexEntry.startsWith(STORAGE_PREFIXES.KEY_INDEX)) {
    return null;
  }

  const parts = indexEntry.substring(STORAGE_PREFIXES.KEY_INDEX.length).split("_");

  if (parts.length !== 2) {
    return null;
  }

  return parts[1];
}

/**
 * Extract timestamp from a key index entry
 * @param {string} indexEntry - The key index entry
 * @returns {number|null} The timestamp or null if invalid format
 */
export function getTimestampFromIndexEntry(indexEntry) {
  if (!indexEntry.startsWith(STORAGE_PREFIXES.KEY_INDEX)) {
    return null;
  }

  const parts = indexEntry.substring(STORAGE_PREFIXES.KEY_INDEX.length).split("_");

  if (parts.length !== 2) {
    return null;
  }

  return parseInt(parts[0], 10);
}

/**
 * Helper function to generate a rate limit storage key
 * @param {string} clientIp - The client IP address
 * @param {string} path - The request path
 * @returns {string} The rate limit storage key
 */
export function getRateLimitStorageId(clientIp, path) {
  return `${STORAGE_PREFIXES.RATE}${clientIp}:${path}`;
}

/**
 * Helper function to generate a key rotation storage key
 * @param {string} keyId - The API key ID
 * @returns {string} The rotation storage key
 */
export function getRotationStorageId(keyId) {
  return `${STORAGE_PREFIXES.ROTATION}${keyId}`;
}

/**
 * Encode a cursor for pagination
 * @param {string} lastId - The last ID in the current page
 * @param {number} timestamp - The timestamp of the last item
 * @returns {string} Base64 encoded cursor
 */
export function encodeCursor(lastId, timestamp) {
  const cursorData = JSON.stringify({ id: lastId, ts: timestamp });

  return btoa(cursorData);
}

/**
 * Decode a pagination cursor
 * @param {string} cursor - Base64 encoded cursor
 * @returns {Object|null} Decoded cursor data or null if invalid
 */
export function decodeCursor(cursor) {
  try {
    const cursorData = atob(cursor);

    return JSON.parse(cursorData);
  } catch (error) {
    console.error("Invalid cursor format:", error);

    return null;
  }
}
