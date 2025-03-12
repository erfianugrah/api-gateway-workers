import { Command } from "../../command/Command.js";
import { isValidUuid, validateKeyRotationParams } from "../../../utils/validation.js";

/**
 * Command to rotate an API key
 */
export class RotateKeyCommand extends Command {
  /**
   * Create a new RotateKeyCommand
   *
   * @param {Object} data - Key rotation parameters
   */
  constructor(data) {
    super();
    this.keyId = data.keyId;
    this.gracePeriodDays = data.gracePeriodDays;
    this.scopes = data.scopes;
    this.name = data.name;
    this.expiresAt = data.expiresAt;
    this.rotatedBy = data.rotatedBy;
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

    // Validate rotation parameters
    const rotationValidation = validateKeyRotationParams({
      gracePeriodDays: this.gracePeriodDays,
      scopes: this.scopes,
      name: this.name,
      expiresAt: this.expiresAt,
    });

    if (!rotationValidation.isValid) {
      // Merge validation errors
      Object.assign(errors, rotationValidation.errors);
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}
