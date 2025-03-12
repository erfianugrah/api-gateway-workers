import { CommandHandler } from "../../command/CommandHandler.js";
import { RotateKeyCommand } from "../commands/RotateKeyCommand.js";
import { NotFoundError } from "../../errors/ApiError.js";

/**
 * Handler for rotating API keys
 */
export class RotateKeyHandler extends CommandHandler {
  /**
   * Create a new RotateKeyHandler
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
    return command instanceof RotateKeyCommand;
  }

  /**
   * Handle the command
   *
   * @param {RotateKeyCommand} command - Command to handle
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Rotation result
   */
  async handle(command, context = {}) {
    // Rotate the key
    const result = await this.keyService.rotateKey(
      command.keyId,
      {
        gracePeriodDays: command.gracePeriodDays,
        scopes: command.scopes,
        name: command.name,
        expiresAt: command.expiresAt,
        rotatedBy: command.rotatedBy,
      }
    );

    // If rotation failed, handle the error
    if (!result.success) {
      if (result.error.includes("not found")) {
        throw new NotFoundError("API key", command.keyId);
      }

      throw new Error(result.error);
    }

    // Log the action if we have admin info
    if (command.rotatedBy && this.auditLogger) {
      await this.auditLogger.logAdminAction(
        command.rotatedBy,
        "rotate_key",
        {
          keyId: command.keyId,
          newKeyId: result.newKey?.id,
          gracePeriodDays: command.gracePeriodDays,
        },
        context.env,
        context.request
      );
    }

    return result;
  }
}
