/**
 * Constants for storage prefixes to avoid typos and enable easier changes
 * @type {Object}
 */
export const STORAGE_PREFIXES = {
  KEY: 'key:',
  LOOKUP: 'lookup:',
  RATE: 'rate:'
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
 * Helper function to generate a rate limit storage key
 * @param {string} clientIp - The client IP address
 * @param {string} path - The request path
 * @returns {string} The rate limit storage key
 */
export function getRateLimitStorageId(clientIp, path) {
  return `${STORAGE_PREFIXES.RATE}${clientIp}:${path}`;
}