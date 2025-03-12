import { CommandHandler } from "../../command/CommandHandler.js";
import { GetKeyCommand } from "../commands/GetKeyCommand.js";
import { NotFoundError } from "../../errors/ApiError.js";

/**
 * Handler for retrieving API keys
 */
export class GetKeyHandler extends CommandHandler {
  /**
   * Create a new GetKeyHandler
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
    return command instanceof GetKeyCommand;
  }

  /**
   * Handle the command
   *
   * @param {GetKeyCommand} command - Command to handle
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} API key data
   */
  async handle(command, context = {}) {
    // Get the key
    const key = await this.keyService.getKey(command.keyId);

    if (!key) {
      throw new NotFoundError("API key", command.keyId);
    }

    // Log the action if we have admin info
    if (context.adminId && this.auditLogger) {
      await this.auditLogger.logAdminAction(
        context.adminId,
        "get_key",
        {
          keyId: command.keyId,
        },
        context.env,
        context.request
      );
    }

    return key;
  }
}
