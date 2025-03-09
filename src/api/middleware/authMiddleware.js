import {
  ForbiddenError,
  UnauthorizedError,
} from "../../core/errors/ApiError.js";

/**
 * Authentication middleware factory
 *
 * @param {AuthService} authService - Authentication service
 * @param {string} [requiredPermission] - Optional permission to require
 * @returns {Function} Middleware function
 */
export function createAuthMiddleware(authService, requiredPermission = null) {
  return async (request, env) => {
    // Extract API key from header
    const apiKey = request.headers.get("X-Api-Key");

    // Authenticate the request
    const auth = await authService.authenticate(apiKey);

    if (!auth.authenticated) {
      throw new UnauthorizedError(auth.error);
    }

    // Check permission if required
    if (requiredPermission) {
      authService.requirePermission(auth.admin, requiredPermission);
    }

    // Add admin info to request context
    return {
      ...request,
      admin: auth.admin,
    };
  };
}
