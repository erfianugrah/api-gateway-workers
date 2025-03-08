/**
 * Authentication Module for API Key Manager
 * Main export file that brings together all auth components
 */

import { validateApiKey } from "./keyValidator.js";
import { createApiKey, generateSecureApiKey } from "./keyGenerator.js";
import { ADMIN_ROLES, hasPermission } from "./roles.js";
import { createAdminKey, setupFirstAdmin } from "./adminManager.js";
import { logAdminAction } from "./auditLogger.js";

// Export all auth components
export {
  // Roles and permissions
  ADMIN_ROLES,
  createAdminKey,
  // Key generation
  createApiKey,
  generateSecureApiKey,
  hasPermission,
  // Audit logging
  logAdminAction,
  // Admin management
  setupFirstAdmin,
  // Key validation
  validateApiKey,
};

// Primary auth middleware for securing admin routes
export async function authMiddleware(request, env) {
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
}
