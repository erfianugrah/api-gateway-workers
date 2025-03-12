import { checkRateLimit, getRateLimitStorageId } from "../../utils/security.js";
import { RateLimitError } from "../errors/ApiError.js";

/**
 * Service for rate limiting
 */
export class RateLimiter {
  /**
   * Create a new RateLimiter
   *
   * @param {Object} storage - Storage service
   * @param {Object} config - Rate limit configuration
   */
  constructor(storage, config = {}) {
    this.storage = storage;
    this.config = {
      defaultLimit: 100,
      defaultWindow: 60000, // 1 minute in ms
      endpoints: {},
      ...config,
    };
  }

  /**
   * Check if a request is rate limited
   *
   * @param {string} clientIp - Client IP address
   * @param {string} path - Request path
   * @returns {Promise<void>} Resolves if not limited, throws if limited
   * @throws {RateLimitError} If rate limit exceeded
   */
  async checkLimit(clientIp, path) {
    // Determine limits for this endpoint
    let limit = this.config.defaultLimit;
    let windowMs = this.config.defaultWindow;

    // Check if this endpoint has custom limits
    const endpoint = Object.keys(this.config.endpoints)
      .find((e) => path.startsWith(e));

    if (endpoint) {
      const endpointConfig = this.config.endpoints[endpoint];

      limit = endpointConfig.limit || limit;
      windowMs = endpointConfig.window || windowMs;
    }

    // Generate storage key
    const rateLimitKey = getRateLimitStorageId(clientIp, path);

    // Check rate limit
    const result = await checkRateLimit(
      this.storage,
      rateLimitKey,
      limit,
      windowMs
    );

    // If limited, throw error
    if (result.limited) {
      throw new RateLimitError(result.retryAfter);
    }

    // Return rate limit info
    return {
      limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }
}
