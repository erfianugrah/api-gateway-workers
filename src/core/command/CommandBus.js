import { ValidationError } from "../errors/ApiError.js";

/**
 * CommandBus routes commands to their handlers
 */
export class CommandBus {
  /**
   * Create a new CommandBus
   *
   * @param {CommandHandler[]} handlers - Array of command handlers
   */
  constructor(handlers = []) {
    this.handlers = new Map();

    // Register handlers
    for (const handler of handlers) {
      this.registerHandler(handler);
    }
  }

  /**
   * Register a handler
   *
   * @param {CommandHandler} handler - Handler to register
   */
  registerHandler(handler) {
    this.handlers.set(handler.constructor.name, handler);
  }

  /**
   * Execute a command
   *
   * @param {Command} command - Command to execute
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Command result
   * @throws {Error} If no handler is found or validation fails
   */
  async execute(command, context = {}) {
    // Validate the command
    const validation = command.validate();

    if (!validation.isValid) {
      throw new ValidationError(
        `Invalid ${command.getName()}`,
        validation.errors
      );
    }

    // Find a handler for this command
    const handler = this.findHandler(command);

    if (!handler) {
      throw new Error(`No handler found for ${command.getName()}`);
    }

    // Execute the command
    return await handler.handle(command, context);
  }

  /**
   * Find a handler for a command
   *
   * @param {Command} command - Command to find a handler for
   * @returns {CommandHandler|null} Handler or null if none found
   */
  findHandler(command) {
    // First try to find by explicit naming convention
    const handlerName = `${command.getName()}Handler`;

    if (this.handlers.has(handlerName)) {
      return this.handlers.get(handlerName);
    }

    // Otherwise try to find by capability
    for (const handler of this.handlers.values()) {
      if (handler.canHandle(command)) {
        return handler;
      }
    }

    return null;
  }
}
