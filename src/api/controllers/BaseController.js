import { errorHandler } from "../middleware/errorHandler.js";

/**
 * Base controller with shared functionality
 */
export class BaseController {
  /**
   * Create a new controller
   *
   * @param {Object} services - Service dependencies
   */
  constructor(services = {}) {
    this.services = services;
  }

  /**
   * Create a request handler with error handling
   *
   * @param {Function} handlerFn - Handler function
   * @returns {Function} Request handler
   */
  handle(handlerFn) {
    return async (request, context) => {
      try {
        return await handlerFn.call(this, request, context);
      } catch (error) {
        return errorHandler(error, request);
      }
    };
  }

  /**
   * Get admin info from request
   *
   * @param {Request} request - HTTP request
   * @returns {Object} Admin info
   */
  getAdminInfo(request) {
    return {
      keyId: request.headers.get("X-Admin-ID"),
      email: request.headers.get("X-Admin-Email"),
      role: request.headers.get("X-Admin-Role"),
      name: request.headers.get("X-Admin-Name"),
      scopes: [],
    };
  }
}
