/**
 * Base Command class
 * Represents a request to perform an operation
 */
export class Command {
  /**
   * Get the command name
   *
   * @returns {string} Command name
   */
  getName() {
    return this.constructor.name;
  }

  /**
   * Validate the command data
   *
   * @returns {Object} Validation result with { isValid, errors }
   */
  validate() {
    return { isValid: true, errors: {} };
  }
}
