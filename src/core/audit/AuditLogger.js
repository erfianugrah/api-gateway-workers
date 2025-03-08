/**
 * Audit logger for tracking administrative actions
 */
export class AuditLogger {
  /**
   * Create a new AuditLogger
   *
   * @param {Object} storage - Storage service for audit logs
   */
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Log an admin action
   *
   * @param {string} adminId - ID of the admin performing the action
   * @param {string} action - Action being performed
   * @param {Object} details - Details about the action
   * @param {Object} env - Environment variables and bindings
   * @param {Request} [request] - Optional request object for IP extraction
   * @returns {Promise<string>} ID of the log entry
   */
  async logAdminAction(adminId, action, details, env, request) {
    // Generate a unique ID for the log entry
    const logId = crypto.randomUUID();

    // Get client IP if request is provided
    let clientIp = "unknown";
    let userAgent = "unknown";
    if (request) {
      clientIp = this.getClientIp(request);
      userAgent = request.headers.get("User-Agent") || "unknown";
    }

    // Create log entry
    const logEntry = {
      id: logId,
      timestamp: Date.now(),
      adminId: adminId,
      action: action,
      details: details || {},
      ip: clientIp,
      userAgent: userAgent,
    };

    // Store log entry
    await this.storage.put(`log:admin:${logId}`, JSON.stringify(logEntry));

    // Store index by admin ID for quick lookups
    const timeKey = `${Date.now().toString().padStart(16, "0")}_${logId}`;
    await this.storage.put(`log:admin:by_admin:${adminId}:${timeKey}`, logId);

    // Store index by action type
    await this.storage.put(`log:admin:by_action:${action}:${timeKey}`, logId);

    // For critical actions, store in a separate list
    if (this.isCriticalAction(action)) {
      await this.storage.put(`log:admin:critical:${timeKey}`, logId);
    }

    return logId;
  }

  /**
   * Get logs for a specific admin
   *
   * @param {string} adminId - Admin ID to get logs for
   * @param {Object} options - Options for fetching logs
   * @param {number} options.limit - Maximum number of logs to return
   * @param {string} options.cursor - Cursor for pagination
   * @returns {Promise<Object>} Logs with pagination info
   */
  async getAdminLogs(adminId, options = {}) {
    const limit = options.limit || 50;
    let cursor = options.cursor || "";

    // List logs for the admin
    const logIndices = await this.storage.list({
      prefix: `log:admin:by_admin:${adminId}:`,
      cursor: cursor,
      limit: limit,
    });

    if (!logIndices || !logIndices.keys || logIndices.keys.length === 0) {
      return {
        logs: [],
        cursor: null,
        hasMore: false,
      };
    }

    // Fetch each log entry
    const logs = await Promise.all(
      logIndices.keys.map(async (item) => {
        const logId = await this.storage.get(item.name);

        if (!logId) {
          return null;
        }

        const logData = await this.storage.get(`log:admin:${logId}`);

        if (!logData) {
          return null;
        }

        return JSON.parse(logData);
      }),
    );

    // Filter out any nulls
    const validLogs = logs.filter((log) => log !== null);

    return {
      logs: validLogs,
      cursor: logIndices.cursor,
      hasMore: logIndices.cursor !== null,
    };
  }

  /**
   * Get logs for a specific action type
   *
   * @param {string} action - Action type to get logs for
   * @param {Object} options - Options for fetching logs
   * @param {number} options.limit - Maximum number of logs to return
   * @param {string} options.cursor - Cursor for pagination
   * @returns {Promise<Object>} Logs with pagination info
   */
  async getActionLogs(action, options = {}) {
    const limit = options.limit || 50;
    let cursor = options.cursor || "";

    // List logs for the action
    const logIndices = await this.storage.list({
      prefix: `log:admin:by_action:${action}:`,
      cursor: cursor,
      limit: limit,
    });

    if (!logIndices || !logIndices.keys || logIndices.keys.length === 0) {
      return {
        logs: [],
        cursor: null,
        hasMore: false,
      };
    }

    // Fetch each log entry
    const logs = await Promise.all(
      logIndices.keys.map(async (item) => {
        const logId = await this.storage.get(item.name);

        if (!logId) {
          return null;
        }

        const logData = await this.storage.get(`log:admin:${logId}`);

        if (!logData) {
          return null;
        }

        return JSON.parse(logData);
      }),
    );

    // Filter out any nulls
    const validLogs = logs.filter((log) => log !== null);

    return {
      logs: validLogs,
      cursor: logIndices.cursor,
      hasMore: logIndices.cursor !== null,
    };
  }

  /**
   * Get critical action logs
   *
   * @param {Object} options - Options for fetching logs
   * @param {number} options.limit - Maximum number of logs to return
   * @param {string} options.cursor - Cursor for pagination
   * @returns {Promise<Object>} Logs with pagination info
   */
  async getCriticalLogs(options = {}) {
    const limit = options.limit || 50;
    let cursor = options.cursor || "";

    // List critical logs
    const logIndices = await this.storage.list({
      prefix: "log:admin:critical:",
      cursor: cursor,
      limit: limit,
    });

    if (!logIndices || !logIndices.keys || logIndices.keys.length === 0) {
      return {
        logs: [],
        cursor: null,
        hasMore: false,
      };
    }

    // Fetch each log entry
    const logs = await Promise.all(
      logIndices.keys.map(async (item) => {
        const logId = await this.storage.get(item.name);

        if (!logId) {
          return null;
        }

        const logData = await this.storage.get(`log:admin:${logId}`);

        if (!logData) {
          return null;
        }

        return JSON.parse(logData);
      }),
    );

    // Filter out any nulls
    const validLogs = logs.filter((log) => log !== null);

    return {
      logs: validLogs,
      cursor: logIndices.cursor,
      hasMore: logIndices.cursor !== null,
    };
  }

  /**
   * Determine if an action is critical (high security impact)
   *
   * @param {string} action - Action type
   * @returns {boolean} True if the action is critical
   * @private
   */
  isCriticalAction(action) {
    const criticalActions = [
      "system_setup",
      "system_config_change",
      "system_rotate_keys",
      "create_admin",
      "revoke_admin",
      "update_admin_permissions",
      "revoke_key_batch",
      "key_rotation",
    ];

    return criticalActions.includes(action);
  }

  /**
   * Extract client IP from request
   *
   * @param {Request} request - HTTP request
   * @returns {string} Client IP address
   * @private
   */
  getClientIp(request) {
    // Try to get IP from Cloudflare headers
    const cfIp = request.headers.get("CF-Connecting-IP");
    if (cfIp) {
      return cfIp;
    }

    // Fall back to X-Forwarded-For
    const forwardedFor = request.headers.get("X-Forwarded-For");
    if (forwardedFor) {
      // Extract first IP from list
      return forwardedFor.split(",")[0].trim();
    }

    // No IP available
    return "unknown";
  }
}
