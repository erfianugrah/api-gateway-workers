import { CommandHandler } from "../../command/CommandHandler.js";
import { ListKeysWithCursorCommand } from "../commands/ListKeysWithCursorCommand.js";

/**
 * Handler for listing API keys with cursor-based pagination
 */
export class ListKeysWithCursorHandler extends CommandHandler {
  /**
   * Create a new ListKeysWithCursorHandler
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
    return command instanceof ListKeysWithCursorCommand;
  }

  /**
   * Handle the command
   *
   * @param {ListKeysWithCursorCommand} command - Command to handle
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Paginated key list with cursor
   */
  async handle(command, context = {}) {
    // Get the keys
    const result = await this.keyService.listKeysWithCursor({
      limit: command.limit,
      cursor: command.cursor,
      includeRotated: command.includeRotated,
    });

    // Log the action if we have admin info
    if (context.adminId && this.auditLogger) {
      await this.auditLogger.logAdminAction(
        context.adminId,
        "list_keys_cursor",
        {
          limit: command.limit,
          includeRotated: command.includeRotated,
          itemCount: result.items.length,
        },
        context.env,
        context.request
      );
    }

    return result;
  }
}