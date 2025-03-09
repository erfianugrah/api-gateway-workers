/**
 * Centralized configuration management
 */
export class Config {
  /**
   * Create a new Config
   *
   * @param {Object} env - Environment variables
   */
  constructor(env = {}) {
    this.values = {
      encryption: {
        key: env.ENCRYPTION_KEY || "development-key-do-not-use-in-production",
        algorithm: "AES-GCM",
        iterations: 100000,
      },
      hmac: {
        secret: env.HMAC_SECRET || "development-hmac-do-not-use-in-production",
        algorithm: "SHA-384",
      },
      keys: {
        prefix: "km_",
        defaultExpirationDays: 0,
        maxNameLength: 255,
        maxOwnerLength: 255,
        maxScopeLength: 100,
        maxScopes: 50,
      },
      rateLimit: {
        defaultLimit: 100,
        defaultWindow: 60000, // 1 minute
        endpoints: {
          "/validate": { limit: 300 },
          "/keys": { limit: 60 },
        },
      },
      security: {
        cors: {
          allowOrigin: "*",
          allowMethods: "GET, POST, PUT, DELETE, OPTIONS",
          allowHeaders: "Content-Type, Authorization, X-API-Key",
          maxAge: 86400, // 24 hours
        },
      },
      maintenance: {
        cleanupIntervalHours: 24,
        retryIntervalHours: 1,
      },
    };

    // Override with environment values
    this.applyEnvironmentOverrides(env);
  }

  /**
   * Apply environment variable overrides
   *
   * @param {Object} env - Environment variables
   * @private
   */
  applyEnvironmentOverrides(env) {
    // Apply specific overrides based on environment variables
    if (env.KEY_PREFIX) {
      this.values.keys.prefix = env.KEY_PREFIX;
    }

    if (env.RATE_LIMIT) {
      this.values.rateLimit.defaultLimit = parseInt(env.RATE_LIMIT);
    }

    if (env.CORS_ALLOW_ORIGIN) {
      this.values.security.cors.allowOrigin = env.CORS_ALLOW_ORIGIN;
    }

    if (env.MAINTENANCE_INTERVAL_HOURS) {
      this.values.maintenance.cleanupIntervalHours = parseInt(
        env.MAINTENANCE_INTERVAL_HOURS,
      );
    }
  }

  /**
   * Get a configuration value
   *
   * @param {string} path - Dot-separated path to configuration value
   * @param {*} defaultValue - Default value if path doesn't exist
   * @returns {*} Configuration value
   */
  get(path, defaultValue = undefined) {
    const parts = path.split(".");
    let current = this.values;

    for (const part of parts) {
      if (current[part] === undefined) {
        return defaultValue;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Validate critical configuration values
   *
   * @throws {Error} If required configuration is missing
   */
  validate() {
    const isProduction = this.isProduction();

    // Keys that must be set in production
    const requiredInProduction = [
      "encryption.key",
      "hmac.secret",
    ];

    if (isProduction) {
      for (const path of requiredInProduction) {
        const value = this.get(path);
        if (!value || value.includes("development")) {
          throw new Error(
            `Production configuration error: ${path} must be set`,
          );
        }
      }
    }
  }

  /**
   * Check if running in production environment
   *
   * @returns {boolean} True if in production
   */
  isProduction() {
    return this.get("env") === "production" ||
      process.env.NODE_ENV === "production";
  }
}
