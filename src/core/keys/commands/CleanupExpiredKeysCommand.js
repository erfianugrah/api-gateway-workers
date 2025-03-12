import { Command } from "../../command/Command.js";

/**
 * Command to clean up expired keys
 */
export class CleanupExpiredKeysCommand extends Command {
  /**
   * Create a new CleanupExpiredKeysCommand
   */
  constructor() {
    super();
  }

  /**
   * Validate the command data
   *
   * @returns {Object} Validation result with { isValid, errors }
   */
  validate() {
    // No parameters to validate
    return {
      isValid: true,
      errors: {},
    };
  }
}
