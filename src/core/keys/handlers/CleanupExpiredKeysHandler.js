import { CommandHandler } from "../../command/CommandHandler.js";
import { CleanupExpiredKeysCommand } from "../commands/CleanupExpiredKeysCommand.js";

/**
 * Handler for cleaning up expired keys
 */
export class CleanupExpiredKeysHandler extends CommandHandler {
  /**
   * Create a new CleanupExpiredKeysHandler
   *
   * @param {KeyService} keyService - Key service
   * @param {AuditLogger} auditLogger - Audit logger
   */
  constructor(keyService, auditLogger) {
    super();
    this.keyService = keyService;
    this.auditLogger = auditLogger;
  }

  /**
   * Check if this handler can handle the command
   *
   * @param {Command} command - Command to check
   * @returns {boolean} True if this handler can handle the command
   */
  canHandle(command) {
    return command instanceof CleanupExpiredKeysCommand;
  }

  /**
   * Handle the command
   *
   * @param {CleanupExpiredKeysCommand} command - Command to handle
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Cleanup result
   */
  async handle(command, context = {}) {
    // Run cleanup
    const result = await this.keyService.cleanupExpiredKeys();

    // Log the action if we have admin info
    if (context.adminId && this.auditLogger) {
      await this.auditLogger.logAdminAction(
        context.adminId,
        "system_maintenance",
        {
          operation: "cleanup",
          keysExpired: result.expired || 0,
          rotationsExpired: result.rotationsExpired || 0,
        },
        context.env,
        context.request
      );
    }

    return result;
  }
}