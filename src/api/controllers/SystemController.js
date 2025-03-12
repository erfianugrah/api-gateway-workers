import { BaseController } from "./BaseController.js";
import { successResponse } from "../../utils/response.js";
import { ForbiddenError } from "../../core/errors/ApiError.js";
import { CleanupExpiredKeysCommand } from "../../core/keys/commands/CleanupExpiredKeysCommand.js";

/**
 * Controller for system endpoints
 */
export class SystemController extends BaseController {
  /**
   * Create a new SystemController
   *
   * @param {Object} services - Service dependencies
   */
  constructor(services) {
    super(services);

    // Bind methods to maintain 'this' context
    this.getHealth = this.handle(this.getHealth);
    this.runCleanup = this.handle(this.runCleanup);
    this.getAdminLogs = this.handle(this.getAdminLogs);
  }

  /**
   * Get health status
   *
   * @param {Request} request - HTTP request
   * @param {Object} context - Request context
   * @returns {Promise<Response>} HTTP response
   */
  async getHealth(request, context) {
    return successResponse({
      status: "healthy",
      version: context.env.VERSION || "1.0.0",
      timestamp: Date.now(),
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  /**
   * Run maintenance cleanup
   *
   * @param {Request} request - HTTP request
   * @param {Object} context - Request context
   * @returns {Promise<Response>} HTTP response
   */
  async runCleanup(request, context) {
    const adminInfo = this.getAdminInfo(request);

    // Check permissions
    this.services.authService.requirePermission(
      adminInfo,
      "admin:system:maintenance"
    );

    // Create command
    const command = new CleanupExpiredKeysCommand();

    // Execute the command
    const result = await this.services.commandBus.execute(command, {
      adminId: adminInfo.keyId,
      env: context.env,
      request,
    });

    return successResponse(result);
  }

  /**
   * Get admin logs
   *
   * @param {Request} request - HTTP request
   * @param {Object} context - Request context
   * @returns {Promise<Response>} HTTP response
   */
  async getAdminLogs(request, context) {
    const adminInfo = this.getAdminInfo(request);

    // Check permissions
    this.services.authService.requirePermission(
      adminInfo,
      "admin:system:logs"
    );

    // Parse query params
    const url = new URL(request.url);
    const adminId = url.searchParams.get("adminId");
    const action = url.searchParams.get("action");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const cursor = url.searchParams.get("cursor") || "";
    const criticalOnly = url.searchParams.get("critical") === "true";

    // Check for date filter in regex path parameter
    let date = null;

    if (context.params && context.params[0] && /^\d{4}-\d{2}-\d{2}$/.test(context.params[0])) {
      date = context.params[0];
    }

    let result;

    if (date) {
      // Get logs for a specific date
      result = await this.services.auditLogger.getLogsByDate(date, {
        limit,
        cursor,
        adminId,
        action,
      });
    } else if (criticalOnly) {
      // Get critical logs
      result = await this.services.auditLogger.getCriticalLogs({
        limit,
        cursor,
      });
    } else if (adminId) {
      // Get logs for a specific admin
      result = await this.services.auditLogger.getAdminLogs(adminId, {
        limit,
        cursor,
      });
    } else if (action) {
      // Get logs for a specific action
      result = await this.services.auditLogger.getActionLogs(action, {
        limit,
        cursor,
      });
    } else {
      // Get all logs (default to admin's own logs)
      result = await this.services.auditLogger.getAdminLogs(adminInfo.keyId, {
        limit,
        cursor,
      });
    }

    // Set pagination headers
    const headers = {
      "X-Pagination-Limit": limit.toString(),
      "X-Has-More": (result.hasMore).toString(),
    };

    if (result.cursor) {
      headers["X-Next-Cursor"] = result.cursor;
    }

    return successResponse(result.logs, { headers });
  }
}
