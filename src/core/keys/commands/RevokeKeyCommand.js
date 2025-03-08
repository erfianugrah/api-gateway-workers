import { Command } from "../../command/Command.js";
import { isValidUuid } from "../../../utils/validation.js";

/**
 * Command to revoke an API key
 */
export class RevokeKeyCommand extends Command {
  /**
   * Create a new RevokeKeyCommand
   *
   * @param {Object} data - Key revocation parameters
   */
  constructor(data) {
    super();
    this.keyId = data.keyId;
    this.reason = data.reason;
    this.revokedBy = data.revokedBy;
  }

  /**
   * Validate the command
   *
   * @returns {Object} Validation result
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
