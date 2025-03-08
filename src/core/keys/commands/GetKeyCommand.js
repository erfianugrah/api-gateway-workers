import { Command } from "../../command/Command.js";
import { isValidUuid } from "../../../utils/validation.js";

/**
 * Command to get an API key by ID
 */
export class GetKeyCommand extends Command {
  /**
   * Create a new GetKeyCommand
   *
   * @param {Object} data - Command data
   * @param {string} data.keyId - Key ID to retrieve
   */
  constructor(data) {
    super();
    this.keyId = data.keyId;
  }

  /**
   * Validate the command data
   *
   * @returns {Object} Validation result with { isValid, errors }
   */
  validate() {
    const errors = {};

    if (!this.keyId) {
      errors.keyId = "Key ID is required";
    } else if (!isValidUuid(this.keyId)) {
      errors.keyId = "Invalid key ID format";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}