/**
 * Logger service for centralized logging
 */
export class Logger {
  /**
   * Create a new Logger
   *
   * @param {Config} config - Configuration
   */
  constructor(config) {
    this.config = config;
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    // Get configured log level
    this.configuredLevel = this.config.get('logging.level', 'info');
    if (!this.levels.hasOwnProperty(this.configuredLevel)) {
      this.configuredLevel = 'info';
    }
  }
  
  /**
   * Check if a log level is enabled
   *
   * @param {string} level - Log level to check
   * @returns {boolean} True if level is enabled
   * @private
   */
  _isLevelEnabled(level) {
    return this.levels[level] <= this.levels[this.configuredLevel];
  }
  
  /**
   * Format log message
   *
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   * @returns {Object} Formatted log object
   * @private
   */
  _formatLog(level, message, context = {}) {
    // Create base log object
    const log = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    // Add request ID if available
    if (context.requestId) {
      log.requestId = context.requestId;
    }
    
    // Add operation if available
    if (context.operation) {
      log.operation = context.operation;
    }
    
    // Add error information if available
    if (context.error) {
      log.error = {
        name: context.error.name,
        message: context.error.message
      };
      
      // Add stack trace in non-production or if explicitly configured
      if (
        this.config.get('logging.includeTrace', !this.config.isProduction()) &&
        context.error.stack
      ) {
        log.error.stack = context.error.stack;
      }
    }
    
    // Add additional context
    const additionalContext = { ...context };
    
    // Remove processed properties
    delete additionalContext.requestId;
    delete additionalContext.operation;
    delete additionalContext.error;
    
    // Remove sensitive information
    delete additionalContext.key;
    delete additionalContext.token;
    delete additionalContext.password;
    delete additionalContext.secret;
    
    // Add remaining context if not empty
    if (Object.keys(additionalContext).length > 0) {
      log.context = additionalContext;
    }
    
    return log;
  }
  
  /**
   * Log an error message
   *
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  error(message, context = {}) {
    if (this._isLevelEnabled('error')) {
      console.error(JSON.stringify(this._formatLog('error', message, context)));
    }
  }
  
  /**
   * Log a warning message
   *
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  warn(message, context = {}) {
    if (this._isLevelEnabled('warn')) {
      console.warn(JSON.stringify(this._formatLog('warn', message, context)));
    }
  }
  
  /**
   * Log an info message
   *
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  info(message, context = {}) {
    if (this._isLevelEnabled('info')) {
      console.info(JSON.stringify(this._formatLog('info', message, context)));
    }
  }
  
  /**
   * Log a debug message
   *
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  debug(message, context = {}) {
    if (this._isLevelEnabled('debug')) {
      console.debug(JSON.stringify(this._formatLog('debug', message, context)));
    }
  }
  
  /**
   * Log a trace message
   *
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  trace(message, context = {}) {
    if (this._isLevelEnabled('trace')) {
      console.debug(JSON.stringify(this._formatLog('trace', message, context)));
    }
  }
  
  /**
   * Extract request ID from request
   * 
   * @param {Request} request - HTTP request
   * @returns {string|undefined} Request ID or undefined if not found
   */
  getRequestId(request) {
    // Get configured request ID header with fallback
    const header = this.config.get('logging.requestIdHeader', 'X-Request-ID');
    return request.headers.get(header);
  }
}