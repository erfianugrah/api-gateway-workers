/**
 * Roles Module
 * Defines admin roles and permissions
 */

/**
 * Admin role definitions with their associated permission scopes
 */
export const ADMIN_ROLES = {
  SUPER_ADMIN: {
    name: "Super Admin",
    description: "Full system access with all permissions",
    scopes: ["admin:keys:*", "admin:users:*", "admin:system:*"],
  },
  KEY_ADMIN: {
    name: "Key Administrator",
    description: "Can create, view, and revoke API keys",
    scopes: ["admin:keys:create", "admin:keys:read", "admin:keys:revoke"],
  },
  KEY_VIEWER: {
    name: "Key Viewer",
    description: "Can only view API keys",
    scopes: ["admin:keys:read"],
  },
  USER_ADMIN: {
    name: "User Administrator",
    description: "Can manage admin users",
    scopes: ["admin:users:create", "admin:users:read", "admin:users:revoke"],
  },
  SUPPORT: {
    name: "Support",
    description: "Limited access for support staff",
    scopes: ["admin:keys:read", "admin:users:read"],
  },
  CUSTOM: {
    name: "Custom",
    description: "Custom role with specific permissions",
    scopes: [], // To be defined when creating the admin
  },
};

/**
 * Permission scope hierarchy and descriptions
 */
export const PERMISSION_SCOPES = {
  // Key management permissions
  "admin:keys:create": "Create new API keys",
  "admin:keys:read": "View API keys",
  "admin:keys:update": "Update API key properties",
  "admin:keys:revoke": "Revoke API keys",
  "admin:keys:*": "Full access to key management",

  // User management permissions
  "admin:users:create": "Create new admin users",
  "admin:users:read": "View admin users",
  "admin:users:update": "Update admin user properties",
  "admin:users:revoke": "Revoke admin user access",
  "admin:users:*": "Full access to user management",

  // System management permissions
  "admin:system:logs": "View system logs",
  "admin:system:config": "Modify system configuration",
  "admin:system:maintenance": "Perform system maintenance",
  "admin:system:security": "Manage security settings and keys",
  "admin:system:*": "Full access to system management",
};

/**
 * Check if a user has permission to perform an action
 *
 * @param {Object} adminKey - Validated admin key object
 * @param {string} requiredPermission - Permission scope required
 * @returns {boolean} True if admin has the required permission
 */
export function hasPermission(adminKey, requiredPermission) {
  // Validate input
  if (!adminKey || !adminKey.scopes) {
    return false;
  }

  // Normalize required permission to lowercase for case-insensitive checks
  const normalizedRequired = requiredPermission.toLowerCase();

  // Check each scope in the admin key
  for (const scope of adminKey.scopes) {
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
 * Get all permissions for a specific role
 *
 * @param {string} roleName - Role name (from ADMIN_ROLES)
 * @returns {string[]} Array of permission scopes for the role
 */
export function getRolePermissions(roleName) {
  const role = ADMIN_ROLES[roleName];
  if (!role) {
    return [];
  }

  return role.scopes;
}

/**
 * Get all available admin roles
 *
 * @returns {Object} Object with role information
 */
export function getAvailableRoles() {
  const roles = {};

  for (const [key, role] of Object.entries(ADMIN_ROLES)) {
    roles[key] = {
      name: role.name,
      description: role.description,
      scopeCount: role.scopes.length,
    };
  }

  return roles;
}
