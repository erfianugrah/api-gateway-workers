import { CommandHandler } from "../../command/CommandHandler.js";
import { CreateKeyCommand } from "../commands/CreateKeyCommand.js";
import { ValidationError } from "../../errors/ApiError.js";

/**
 * Handler for creating API keys
 */
export class CreateKeyHandler extends CommandHandler {
  /**
   * Create a new CreateKeyHandler
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
    return command instanceof CreateKeyCommand;
  }

  /**
   * Handle the command
   *
   * @param {CreateKeyCommand} command - Command to handle
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Created API key
   */
  async handle(command, context = {}) {
    // Create the key
    const apiKey = await this.keyService.createKey({
      name: command.name,
      owner: command.owner,
      scopes: command.scopes,
      expiresAt: command.expiresAt,
      createdBy: command.createdBy,
      metadata: command.metadata,
    });

    // Log the action if we have admin info
    if (command.createdBy && this.auditLogger) {
      await this.auditLogger.logAdminAction(
        command.createdBy,
        "create_key",
        {
          keyId: apiKey.id,
          name: command.name,
          owner: command.owner,
          scopes: command.scopes,
          expiresAt: command.expiresAt || 0,
        },
        context.env,
        context.request,
      );
    }

    return apiKey;
  }
}
