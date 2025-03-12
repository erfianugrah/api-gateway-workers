import { ForbiddenError, UnauthorizedError } from "../errors/ApiError.js";

/**
 * Unified authentication and authorization service
 */
export class AuthService {
  /**
   * Create a new AuthService
   *
   * @param {Object} keyService - Key service for validating API keys
   * @param {Object} roleManager - Role manager for permission checks
   * @param {Object} [config] - Optional configuration instance
   */
  constructor(keyService, roleManager, config = null) {
    this.keyService = keyService;
    this.roleManager = roleManager;
    this.config = config;
  }

  /**
   * Authenticate a request using an API key
   *
   * @param {string} apiKey - API key from request
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(apiKey) {
    if (!apiKey) {
      return {
        authenticated: false,
        error: "API key is required",
      };
    }

    const validation = await this.keyService.validateKey(apiKey);

    if (!validation.valid) {
      return {
        authenticated: false,
        error: validation.error || "Invalid API key",
      };
    }

    // Check if key has any admin scopes
    const hasAdminScope = validation.scopes.some((scope) =>
      scope.startsWith("admin:")
    );

    if (!hasAdminScope) {
      return {
        authenticated: false,
        error: "This API key lacks administrative permissions",
      };
    }

    return {
      authenticated: true,
      admin: {
        keyId: validation.keyId,
        email: validation.email,
        scopes: validation.scopes,
        role: validation.role,
        name: validation.name,
        owner: validation.owner,
      },
    };
  }

  /**
   * Check if an admin has a specific permission
   *
   * @param {Object} admin - Admin object from authentication
   * @param {string} requiredPermission - Required permission
   * @returns {boolean} True if admin has permission
   */
  hasPermission(admin, requiredPermission) {
    if (!admin || !admin.scopes) {
      return false;
    }

    // Normalize required permission to lowercase for case-insensitive checks
    const normalizedRequired = requiredPermission.toLowerCase();

    // Check each scope in the admin key
    for (const scope of admin.scopes) {
      // Normalize to lowercase
      const normalizedScope = scope.toLowerCase();

      // Direct match - the admin has exactly this permission
      if (normalizedScope === normalizedRequired) {
        return true;
      }

      // Wildcard match at the end (e.g., "admin:keys:*")
      if (normalizedScope.endsWith(":*")) {
        // Get the base scope (everything before the "*")
        const baseScope = normalizedScope.slice(0, -1);

        // If the required permission starts with this base, it's a match
        if (normalizedRequired.startsWith(baseScope)) {
          return true;
        }
      }

      // Full wildcard (e.g., "admin:*") - super admin case
      if (normalizedScope === "admin:*") {
        // If the required permission starts with "admin:", it's a match
        if (normalizedRequired.startsWith("admin:")) {
          return true;
        }
      }
    }

    // No matching permission found
    return false;
  }

  /**
   * Require a permission or throw an error
   *
   * @param {Object} admin - Admin object from authentication
   * @param {string} requiredPermission - Required permission
   * @throws {ForbiddenError} If admin lacks permission
   */
  requirePermission(admin, requiredPermission) {
    if (!this.hasPermission(admin, requiredPermission)) {
      throw new ForbiddenError(
        `You do not have permission: ${requiredPermission}`,
        requiredPermission
      );
    }
  }

  /**
   * Extract admin info from request headers
   *
   * @param {Request} request - HTTP request
   * @returns {Object|null} Admin info or null if not present
   */
  extractAdminInfo(request) {
    const adminId = request.headers.get("X-Admin-ID");

    if (!adminId) {
      return null;
    }

    return {
      keyId: adminId,
      email: request.headers.get("X-Admin-Email") || null,
      role: request.headers.get("X-Admin-Role") || null,
      scopes: [], // We don't have the scopes here - they're checked in the parent worker
      valid: true,
    };
  }
}
