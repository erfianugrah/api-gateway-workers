import { Command } from "../../command/Command.js";

/**
 * Command to validate an API key
 */
export class ValidateKeyCommand extends Command {
  /**
   * Create a new ValidateKeyCommand
   *
   * @param {Object} data - Key validation parameters
   */
  constructor(data) {
    super();
    this.apiKey = data.apiKey;
    this.requiredScopes = data.requiredScopes || [];
  }

  /**
   * Validate the command
   *
   * @returns {Object} Validation result
   */
  validate() {
    const errors = {};

    if (!this.apiKey) {
      errors.apiKey = "API key is required";
    }

    if (this.requiredScopes && !Array.isArray(this.requiredScopes)) {
      errors.requiredScopes = "Required scopes must be an array";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}
