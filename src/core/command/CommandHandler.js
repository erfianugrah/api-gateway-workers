/**
 * Base CommandHandler interface
 * Handlers process commands and produce results
 */
export class CommandHandler {
  /**
   * Check if this handler can handle the given command
   *
   * @param {Command} command - Command to check
   * @returns {boolean} True if this handler can handle the command
   */
  canHandle(command) {
    return false;
  }

  /**
   * Handle the command
   *
   * @param {Command} command - Command to handle
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Command result
   */
  async handle(command, context = {}) {
    throw new Error("Not implemented");
  }
}
