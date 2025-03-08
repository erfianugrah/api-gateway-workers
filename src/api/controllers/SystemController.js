import { BaseController } from "./BaseController.js";
import { successResponse } from "../../utils/response.js";
import { ForbiddenError } from "../../core/errors/ApiError.js";

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
      "admin:system:maintenance",
    );

    // Log the maintenance action
    await this.services.auditLogger.logAdminAction(
      adminInfo.keyId,
      "system_maintenance",
      { operation: "cleanup" },
      context.env,
      request,
    );

    // Run cleanup
    const result = await this.services.keyService.cleanupExpiredKeys();

    return successResponse(result);
  }
}
