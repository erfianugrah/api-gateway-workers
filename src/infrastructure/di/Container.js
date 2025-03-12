/**
 * Simple dependency injection container
 */
export class Container {
  /**
   * Create a new DI container
   */
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a service factory
   *
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   * @param {boolean} [singleton=true] - Whether to cache the service instance
   * @returns {Container} This container for chaining
   */
  register(name, factory, singleton = true) {
    this.services.set(name, { factory, singleton });

    return this;
  }

  /**
   * Resolve a service by name
   *
   * @param {string} name - Service name
   * @returns {*} The resolved service
   * @throws {Error} If service is not registered
   */
  resolve(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not registered`);
    }

    const { factory, singleton } = this.services.get(name);

    // For singletons, return cached instance if available
    if (singleton && this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Create new instance using factory
    const instance = factory(this);

    // Cache singleton instances
    if (singleton) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Clear all singleton instances
   * Useful for testing or state reset
   */
  clearSingletons() {
    this.singletons.clear();
  }
}
