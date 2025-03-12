/**
 * @typedef {"active" | "revoked"} KeyStatus - Status of an API key
 */

/**
 * @typedef {Object} ApiKey
 * @property {string} id - Unique identifier for the API key
 * @property {string} key - The actual API key value
 * @property {string} name - Human-readable name for the API key
 * @property {string} owner - Owner of the API key
 * @property {string[]} scopes - Array of permission scopes for this key
 * @property {KeyStatus} status - Status of the key (active, revoked)
 * @property {number} createdAt - Timestamp when the key was created
 * @property {number} expiresAt - Timestamp when the key expires (0 for no expiration)
 * @property {number} lastUsedAt - Timestamp when the key was last used
 */

/**
 * @typedef {Object} ApiKeyResponse - Safe version of ApiKey for API responses
 * @property {string} id - Unique identifier for the API key
 * @property {string} name - Human-readable name for the API key
 * @property {string} owner - Owner of the API key
 * @property {string[]} scopes - Array of permission scopes for this key
 * @property {KeyStatus} status - Status of the key (active, revoked)
 * @property {number} createdAt - Timestamp when the key was created
 * @property {number} expiresAt - Timestamp when the key expires (0 for no expiration)
 * @property {number} lastUsedAt - Timestamp when the key was last used
 */

/**
 * @typedef {Object} CreateKeyRequest
 * @property {string} name - Human-readable name for the API key
 * @property {string} owner - Owner of the API key
 * @property {string[]} scopes - Array of permission scopes for this key
 * @property {number} [expiresAt] - Optional timestamp when the key expires
 */

/**
 * @typedef {Object} ValidateKeyRequest
 * @property {string} [key] - The API key to validate (can also be provided in X-API-Key header)
 * @property {string[]} [scopes] - Optional array of scopes to check against
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the key is valid
 * @property {string} [error] - Error message if key is invalid
 * @property {string} [owner] - Owner of the API key if valid
 * @property {string[]} [scopes] - Scopes of the API key if valid
 * @property {string} [keyId] - ID of the API key if valid
 */

/**
 * @typedef {Object} RateLimitResult
 * @property {boolean} limited - Whether the request is rate limited
 * @property {number} retryAfter - Seconds until client can retry
 * @property {number} remaining - Remaining requests in the current window
 * @property {number} reset - Timestamp when the rate limit resets
 */
