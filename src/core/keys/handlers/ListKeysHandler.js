import { CommandHandler } from "../../command/CommandHandler.js";
import { ListKeysCommand } from "../commands/ListKeysCommand.js";

/**
 * Handler for listing API keys
 */
export class ListKeysHandler extends CommandHandler {
  /**
   * Create a new ListKeysHandler
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
    return command instanceof ListKeysCommand;
  }

  /**
   * Handle the command
   *
   * @param {ListKeysCommand} command - Command to handle
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Paginated key list
   */
  async handle(command, context = {}) {
    // Get the keys
    const result = await this.keyService.listKeys({
      limit: command.limit,
      offset: command.offset,
    });

    // Log the action if we have admin info
    if (context.adminId && this.auditLogger) {
      await this.auditLogger.logAdminAction(
        context.adminId,
        "list_keys",
        {
          limit: command.limit,
          offset: command.offset,
          totalItems: result.totalItems,
        },
        context.env,
        context.request
      );
    }

    return result;
  }
}