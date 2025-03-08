import { Command } from "../../command/Command.js";
import { validateCreateKeyParams } from "../../../utils/validation.js";

/**
 * Command to create a new API key
 */
export class CreateKeyCommand extends Command {
  /**
   * Create a new CreateKeyCommand
   *
   * @param {Object} data - Key creation parameters
   */
  constructor(data) {
    super();
    this.name = data.name;
    this.owner = data.owner;
    this.scopes = data.scopes;
    this.expiresAt = data.expiresAt;
    this.createdBy = data.createdBy;
    this.metadata = data.metadata || {};
  }

  /**
   * Validate the command
   *
   * @returns {Object} Validation result
   */
  validate() {
    // Use existing validation logic
    return validateCreateKeyParams({
      name: this.name,
      owner: this.owner,
      scopes: this.scopes,
      expiresAt: this.expiresAt,
    });
  }
}
