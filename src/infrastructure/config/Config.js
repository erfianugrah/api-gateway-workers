/**
 * Centralized configuration management
 */
export class Config {
  /**
   * Create a new Config
   *
   * @param {Object} config - Configuration object
   * @param {Object} env - Environment variables (for backward compatibility)
   */
  constructor(config = {}, env = {}) {
    // Initialize with default values
    this.values = {
      encryption: {
        key: "development-key-do-not-use-in-production",
        algorithm: "AES-GCM",
        iterations: 100000,
      },
      hmac: {
        secret: "development-hmac-do-not-use-in-production",
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
        headers: {
          limit: "X-RateLimit-Limit",
          remaining: "X-RateLimit-Remaining",
          reset: "X-RateLimit-Reset"
        }
      },
      security: {
        cors: {
          allowOrigin: "*",
          allowMethods: "GET, POST, PUT, DELETE, OPTIONS",
          allowHeaders: "Content-Type, Authorization, X-API-Key",
          maxAge: 86400, // 24 hours
        },
        apiKeyHeader: "X-API-Key",
        headers: {}
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
        services: {}
      },
    };
    
    // Override with provided config
    if (config && Object.keys(config).length > 0) {
      this.mergeValues(config);
    }

    // Apply legacy environment variable overrides if provided
    if (env && Object.keys(env).length > 0) {
      this.applyLegacyEnvironmentOverrides(env);
    }
  }

  /**
   * Merge provided values into the configuration
   * @param {Object} values - Values to merge
   * @private
   */
  mergeValues(values) {
    // Deep merge
    const merge = (target, source) => {
      if (typeof source !== 'object' || source === null) {
        return source;
      }
      
      if (typeof target !== 'object' || target === null) {
        return Array.isArray(source) ? [...source] : {...source};
      }
      
      const result = {...target};
      
      Object.keys(source).forEach(key => {
        if (typeof source[key] === 'object' && source[key] !== null &&
            typeof result[key] === 'object' && result[key] !== null &&
            !Array.isArray(source[key])) {
          result[key] = merge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      });
      
      return result;
    };
    
    this.values = merge(this.values, values);
  }

  /**
   * Apply legacy environment variable overrides (for backward compatibility)
   *
   * @param {Object} env - Environment variables
   * @private
   */
  applyLegacyEnvironmentOverrides(env) {
    // Apply specific overrides based on environment variables
    if (env.KEY_PREFIX) {
      this.values.keys.prefix = env.KEY_PREFIX;
    }

    if (env.RATE_LIMIT) {
      this.values.rateLimit.defaultLimit = parseInt(env.RATE_LIMIT);
    }
    
    if (env.RATE_LIMIT_WINDOW) {
      this.values.rateLimit.defaultWindow = parseInt(env.RATE_LIMIT_WINDOW);
    }

    if (env.CORS_ALLOW_ORIGIN) {
      this.values.security.cors.allowOrigin = env.CORS_ALLOW_ORIGIN;
    }
    
    if (env.CORS_ALLOW_METHODS) {
      this.values.security.cors.allowMethods = env.CORS_ALLOW_METHODS;
    }
    
    if (env.CORS_ALLOW_HEADERS) {
      this.values.security.cors.allowHeaders = env.CORS_ALLOW_HEADERS;
    }
    
    if (env.CORS_MAX_AGE) {
      this.values.security.cors.maxAge = parseInt(env.CORS_MAX_AGE);
    }
    
    if (env.API_KEY_HEADER) {
      this.values.security.apiKeyHeader = env.API_KEY_HEADER;
    }

    if (env.MAINTENANCE_INTERVAL_HOURS) {
      this.values.maintenance.cleanupIntervalHours = parseInt(
        env.MAINTENANCE_INTERVAL_HOURS,
      );
    }
    
    if (env.MAINTENANCE_RETRY_INTERVAL_HOURS) {
      this.values.maintenance.retryIntervalHours = parseInt(
        env.MAINTENANCE_RETRY_INTERVAL_HOURS,
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
    
    // Route priority overrides
    if (env.ROUTING_PRIORITY_EXACT) {
      this.values.routing.priority.exact = parseInt(env.ROUTING_PRIORITY_EXACT);
    }
    
    if (env.ROUTING_PRIORITY_PARAMETER) {
      this.values.routing.priority.parameter = parseInt(env.ROUTING_PRIORITY_PARAMETER);
    }
    
    if (env.ROUTING_PRIORITY_REGEX) {
      this.values.routing.priority.regex = parseInt(env.ROUTING_PRIORITY_REGEX);
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
    
    if (env.PROXY_RETRY_BACKOFF) {
      this.values.proxy.retry.backoff = parseInt(env.PROXY_RETRY_BACKOFF);
    }
    
    if (env.PROXY_CIRCUIT_BREAKER_ENABLED !== undefined) {
      this.values.proxy.circuitBreaker.enabled = env.PROXY_CIRCUIT_BREAKER_ENABLED === 'true';
    }
    
    if (env.PROXY_CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      this.values.proxy.circuitBreaker.failureThreshold = parseInt(env.PROXY_CIRCUIT_BREAKER_FAILURE_THRESHOLD);
    }
    
    if (env.PROXY_CIRCUIT_BREAKER_RESET_TIMEOUT) {
      this.values.proxy.circuitBreaker.resetTimeout = parseInt(env.PROXY_CIRCUIT_BREAKER_RESET_TIMEOUT);
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
    
    // Rate limit header overrides
    if (env.RATE_LIMIT_HEADER_LIMIT) {
      this.values.rateLimit.headers.limit = env.RATE_LIMIT_HEADER_LIMIT;
    }
    
    if (env.RATE_LIMIT_HEADER_REMAINING) {
      this.values.rateLimit.headers.remaining = env.RATE_LIMIT_HEADER_REMAINING;
    }
    
    if (env.RATE_LIMIT_HEADER_RESET) {
      this.values.rateLimit.headers.reset = env.RATE_LIMIT_HEADER_RESET;
    }
    
    // Also try to read keys from environment for backward compatibility
    if (env.ENCRYPTION_KEY) {
      this.values.encryption.key = env.ENCRYPTION_KEY;
    }
    
    if (env.HMAC_SECRET) {
      this.values.hmac.secret = env.HMAC_SECRET;
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
      if (current === undefined || current[part] === undefined) {
        return defaultValue;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Set a configuration value
   *
   * @param {string} path - Dot-separated path to configuration value
   * @param {*} value - Value to set
   * @returns {Config} This config instance for chaining
   */
  set(path, value) {
    const parts = path.split(".");
    let current = this.values;

    // Create nested objects as needed
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }

    // Set the value
    current[parts[parts.length - 1]] = value;
    return this;
  }

  /**
   * Validate critical configuration values
   *
   * @param {boolean} [throwOnError=true] - Whether to throw errors or just return validation status
   * @returns {Object} Validation result with isValid and errors properties 
   * @throws {Error} If required configuration is missing and throwOnError is true
   */
  validate(throwOnError = true) {
    const isProduction = this.isProduction();
    const errors = [];

    // Keys that must be set in production
    const requiredInProduction = [
      "encryption.key",
      "hmac.secret",
    ];

    if (isProduction) {
      for (const path of requiredInProduction) {
        const value = this.get(path);
        if (!value) {
          errors.push(`Production configuration error: ${path} is required but missing`);
        } else if (value.includes("development")) {
          errors.push(`Production configuration error: ${path} cannot use development value`);
        }
      }
      
      // Check if we need to throw errors
      if (errors.length > 0 && throwOnError) {
        throw new Error(errors.join('; '));
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
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
   * Get rate limiting configuration
   * 
   * @returns {Object} Rate limit configuration
   */
  getRateLimitConfig() {
    return {
      defaultLimit: this.get('rateLimit.defaultLimit'),
      defaultWindow: this.get('rateLimit.defaultWindow'),
      endpoints: this.get('rateLimit.endpoints'),
      headers: this.get('rateLimit.headers')
    };
  }
  
  /**
   * Get security configuration
   * 
   * @returns {Object} Security configuration
   */
  getSecurityConfig() {
    return {
      cors: this.get('security.cors'),
      headers: this.get('security.headers'),
      apiKeyHeader: this.get('security.apiKeyHeader')
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
  
  /**
   * Register a rate limit for an endpoint
   * 
   * @param {string} endpoint - Endpoint path
   * @param {Object} config - Rate limit configuration
   * @param {number} config.limit - Rate limit
   * @param {number} [config.window] - Rate limit window in milliseconds
   * @returns {Config} - This config instance for chaining
   */
  registerRateLimit(endpoint, config) {
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('Endpoint path is required');
    }
    
    if (!config || !config.limit) {
      throw new Error('Rate limit is required');
    }
    
    // Initialize endpoints object if it doesn't exist
    if (!this.values.rateLimit.endpoints) {
      this.values.rateLimit.endpoints = {};
    }
    
    // Store the rate limit configuration
    this.values.rateLimit.endpoints[endpoint] = config;
    
    return this;
  }
}