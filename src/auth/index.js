/**
 * Authentication Module for API Key Manager
 * Main export file that brings together all auth components
 */

import { validateApiKey } from "./keyValidator.js";
import { createApiKey, generateSecureApiKey } from "./keyGenerator.js";
import { ADMIN_ROLES, hasPermission, PERMISSION_SCOPES } from "./roles.js";
import {
  createAdminKey,
  isSetupCompleted,
  setupFirstAdmin,
} from "./adminManager.js";
import { logAdminAction } from "./auditLogger.js";

// Export all auth components
export {
  // Roles and permissions
  ADMIN_ROLES,
  // Admin management
  createAdminKey,
  // Key generation
  createApiKey,
  generateSecureApiKey,
  hasPermission,
  isSetupCompleted,
  // Audit logging
  logAdminAction,
  PERMISSION_SCOPES,
  setupFirstAdmin,
  // Key validation
  validateApiKey,
};

/**
 * Primary auth middleware for securing admin routes
 *
 * @param {Request} request - The HTTP request
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<Object>} Authentication result
 */
export async function authMiddleware(request, env) {
  try {
    // Extract API key from header
    const apiKey = request.headers.get("X-Api-Key");

    // No API key provided
    if (!apiKey) {
      return {
        authorized: false,
        error: "Authentication required",
        status: 401,
      };
    }

    // Validate the API key
    const result = await validateApiKey(apiKey, [], env);

    // Invalid API key
    if (!result.valid) {
      return {
        authorized: false,
        error: result.error || "Invalid API key",
        status: 401,
      };
    }

    // Check if key has any admin scopes
    const hasAdminScope = result.scopes.some((scope) =>
      scope.startsWith("admin:")
    );

    if (!hasAdminScope) {
      return {
        authorized: false,
        error: "This API key lacks administrative permissions",
        status: 403,
      };
    }

    // Key is valid and has admin permissions
    return {
      authorized: true,
      adminKey: result,
    };
  } catch (error) {
    console.error("Authentication error:", error);

    return {
      authorized: false,
      error: "Authentication error",
      status: 500,
    };
  }
}
