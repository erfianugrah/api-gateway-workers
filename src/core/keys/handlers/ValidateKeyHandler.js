import { CommandHandler } from "../../command/CommandHandler.js";
import { ValidateKeyCommand } from "../commands/ValidateKeyCommand.js";

/**
 * Handler for validating API keys
 */
export class ValidateKeyHandler extends CommandHandler {
  /**
   * Create a new ValidateKeyHandler
   *
   * @param {KeyService} keyService - Key service
   */
  constructor(keyService) {
    super();
    this.keyService = keyService;
  }

  /**
   * Check if this handler can handle the command
   *
   * @param {Command} command - Command to check
   * @returns {boolean} True if this handler can handle the command
   */
  canHandle(command) {
    return command instanceof ValidateKeyCommand;
  }

  /**
   * Handle the command
   *
   * @param {ValidateKeyCommand} command - Command to handle
   * @returns {Promise<Object>} Validation result
   */
  async handle(command) {
    return this.keyService.validateKey(command.apiKey, command.requiredScopes);
  }
}
