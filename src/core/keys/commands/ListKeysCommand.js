import { Command } from "../../command/Command.js";
import { validatePaginationParams } from "../../../utils/validation.js";

/**
 * Command to list API keys
 */
export class ListKeysCommand extends Command {
  /**
   * Create a new ListKeysCommand
   *
   * @param {Object} data - Command data
   * @param {number} [data.limit=100] - Maximum number of keys to return
   * @param {number} [data.offset=0] - Number of keys to skip
   */
  constructor(data = {}) {
    super();
    this.limit = data.limit || 100;
    this.offset = data.offset || 0;
  }

  /**
   * Validate the command data
   *
   * @returns {Object} Validation result with { isValid, errors }
   */
  validate() {
    const validation = validatePaginationParams(this.limit, this.offset);

    return {
      isValid: validation.isValid,
      errors: validation.errors || {},
    };
  }
}
