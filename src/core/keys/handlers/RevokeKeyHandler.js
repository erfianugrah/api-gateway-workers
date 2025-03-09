import { CommandHandler } from "../../command/CommandHandler.js";
import { RevokeKeyCommand } from "../commands/RevokeKeyCommand.js";
import { NotFoundError } from "../../errors/ApiError.js";

/**
 * Handler for revoking API keys
 */
export class RevokeKeyHandler extends CommandHandler {
  /**
   * Create a new RevokeKeyHandler
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
    return command instanceof RevokeKeyCommand;
  }

  /**
   * Handle the command
   *
   * @param {RevokeKeyCommand} command - Command to handle
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Revocation result
   */
  async handle(command, context = {}) {
    // Revoke the key
    const result = await this.keyService.revokeKey(
      command.keyId,
      command.reason || "Administrative action",
      command.revokedBy,
    );

    // If revocation failed, handle the error
    if (!result.success) {
      if (result.error.includes("not found")) {
        throw new NotFoundError("API key", command.keyId);
      }
      throw new Error(result.error);
    }

    // Log the action if we have admin info
    if (command.revokedBy && this.auditLogger) {
      await this.auditLogger.logAdminAction(
        command.revokedBy,
        "revoke_key",
        {
          keyId: command.keyId,
          reason: command.reason || "Administrative action",
        },
        context.env,
        context.request,
      );
    }

    return result;
  }
}
