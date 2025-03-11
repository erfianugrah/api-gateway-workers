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
      logging: {
        level: env.LOG_LEVEL || (env.NODE_ENV === "production" ? "error" : "info"),
        includeTrace: env.LOG_INCLUDE_TRACE === "true" || env.NODE_ENV !== "production",
        requestIdHeader: env.REQUEST_ID_HEADER || "X-Request-ID",
      },
      maintenance: {
        cleanupIntervalHours: 24,
        retryIntervalHours: 1,
      },
      routing: {
        // API versioning configuration
        versioning: {
          enabled: true,
          current: "1",
          supported: ["1"],
          deprecated: [],
          versionHeader: "X-API-Version"
        },
        // Path parameter validation patterns
        paramValidation: {
          id: "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", // UUID format
          date: "\\d{4}-\\d{2}-\\d{2}", // YYYY-MM-DD format
          status: "(active|revoked|expired)" // Valid status values
        },
        // Route priority (lower number = higher priority)
        priority: {
          exact: 1,
          parameter: 2,
          regex: 3
        }
      },
      proxy: {
        // Master switch for proxy functionality
        enabled: false,
        // Default timeout for proxied requests (ms)
        timeout: 30000,
        // Default headers to add to proxied requests
        headers: {
          "X-Forwarded-By": "key-manager-gateway"
        },
        // Circuit breaker configuration
        circuitBreaker: {
          enabled: true,
          failureThreshold: 5,
          resetTimeout: 30000
        },
        // Retry configuration
        retry: {
          enabled: true,
          maxAttempts: 3,
          backoff: 1000 // Initial backoff in ms (doubles with each retry)
        },
        // Upstream services configuration
        services: {
          // No services defined by default
        }
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
    
    // API versioning overrides
    if (env.API_VERSION_CURRENT) {
      this.values.routing.versioning.current = env.API_VERSION_CURRENT;
    }
    
    if (env.API_VERSIONS_SUPPORTED) {
      this.values.routing.versioning.supported = env.API_VERSIONS_SUPPORTED.split(',').map(v => v.trim());
    }
    
    if (env.API_VERSIONS_DEPRECATED) {
      this.values.routing.versioning.deprecated = env.API_VERSIONS_DEPRECATED.split(',').map(v => v.trim());
    }
    
    if (env.API_VERSION_HEADER) {
      this.values.routing.versioning.versionHeader = env.API_VERSION_HEADER;
    }
    
    // Route pattern overrides
    if (env.ROUTING_API_VERSIONING_ENABLED !== undefined) {
      this.values.routing.versioning.enabled = env.ROUTING_API_VERSIONING_ENABLED === 'true';
    }
    
    // Proxy configuration overrides
    if (env.PROXY_ENABLED !== undefined) {
      this.values.proxy.enabled = env.PROXY_ENABLED === 'true';
    }
    
    if (env.PROXY_TIMEOUT) {
      this.values.proxy.timeout = parseInt(env.PROXY_TIMEOUT);
    }
    
    if (env.PROXY_RETRY_ENABLED !== undefined) {
      this.values.proxy.retry.enabled = env.PROXY_RETRY_ENABLED === 'true';
    }
    
    if (env.PROXY_RETRY_MAX_ATTEMPTS) {
      this.values.proxy.retry.maxAttempts = parseInt(env.PROXY_RETRY_MAX_ATTEMPTS);
    }
    
    if (env.PROXY_CIRCUIT_BREAKER_ENABLED !== undefined) {
      this.values.proxy.circuitBreaker.enabled = env.PROXY_CIRCUIT_BREAKER_ENABLED === 'true';
    }
    
    // Logging overrides
    if (env.LOG_LEVEL) {
      this.values.logging.level = env.LOG_LEVEL;
    }
    
    if (env.LOG_INCLUDE_TRACE !== undefined) {
      this.values.logging.includeTrace = env.LOG_INCLUDE_TRACE === 'true';
    }
    
    if (env.REQUEST_ID_HEADER) {
      this.values.logging.requestIdHeader = env.REQUEST_ID_HEADER;
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

  /**
   * Get a regex pattern from parameter validation configuration
   *
   * @param {string} paramType - Type of parameter (id, date, status, etc.)
   * @returns {RegExp|null} Compiled regex pattern or null if not found
   */
  getRegexPattern(paramType) {
    const pattern = this.get(`routing.paramValidation.${paramType}`);
    if (!pattern) return null;
    return new RegExp(`^${pattern}$`);
  }
  
  /**
   * Get API version information
   *
   * @returns {Object} API version information
   */
  getVersionInfo() {
    return {
      enabled: this.get('routing.versioning.enabled'),
      current: this.get('routing.versioning.current'),
      supported: this.get('routing.versioning.supported'),
      deprecated: this.get('routing.versioning.deprecated'),
      versionHeader: this.get('routing.versioning.versionHeader')
    };
  }
  
  /**
   * Get proxy configuration
   * 
   * @returns {Object} Proxy configuration
   */
  getProxyConfig() {
    return {
      enabled: this.get('proxy.enabled'),
      timeout: this.get('proxy.timeout'),
      headers: this.get('proxy.headers'),
      circuitBreaker: this.get('proxy.circuitBreaker'),
      retry: this.get('proxy.retry'),
      services: this.get('proxy.services')
    };
  }
  
  /**
   * Register a proxy service
   * 
   * @param {string} name - Service name
   * @param {Object} config - Service configuration
   * @param {string} config.target - Target URL (e.g., "https://api.example.com")
   * @param {Object} [config.pathRewrite] - Path rewrite rules
   * @param {Object} [config.headers] - Additional headers
   * @param {number} [config.timeout] - Service-specific timeout
   * @returns {Config} - This config instance for chaining
   */
  registerProxyService(name, config) {
    if (!name || typeof name !== 'string') {
      throw new Error('Service name is required');
    }
    
    if (!config || !config.target) {
      throw new Error('Service target URL is required');
    }
    
    // Initialize services object if it doesn't exist
    if (!this.values.proxy.services) {
      this.values.proxy.services = {};
    }
    
    // Store the service configuration
    this.values.proxy.services[name] = config;
    
    return this;
  }
}
