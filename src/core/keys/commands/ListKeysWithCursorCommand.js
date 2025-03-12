import { Command } from "../../command/Command.js";
import { validateCursorParams } from "../../../utils/validation.js";

/**
 * Command to list API keys with cursor-based pagination
 */
export class ListKeysWithCursorCommand extends Command {
  /**
   * Create a new ListKeysWithCursorCommand
   *
   * @param {Object} data - Command data
   * @param {number} [data.limit=100] - Maximum number of keys to return
   * @param {string} [data.cursor=null] - Pagination cursor
   * @param {boolean} [data.includeRotated=false] - Whether to include rotated keys
   */
  constructor(data = {}) {
    super();
    this.limit = data.limit || 100;
    this.cursor = data.cursor || null;
    this.includeRotated = data.includeRotated || false;
  }

  /**
   * Validate the command data
   *
   * @returns {Object} Validation result with { isValid, errors }
   */
  validate() {
    const validation = validateCursorParams(this.limit, this.cursor);

    return {
      isValid: validation.isValid,
      errors: validation.errors || {},
    };
  }
}
