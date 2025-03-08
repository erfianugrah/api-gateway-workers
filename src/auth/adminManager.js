/**
 * Admin Manager Module
 * Handles admin user management and the first-time setup process
 */

import { createApiKey } from "./keyGenerator.js";
import { ADMIN_ROLES } from "./roles.js";
import { logAdminAction } from "./auditLogger.js";

/**
 * Check if system setup has been completed
 *
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<boolean>} True if setup is complete
 */
export async function isSetupCompleted(env) {
  const setupStatus = await env.KV.get("system:setup_completed");
  return setupStatus === "true";
}

/**
 * Check if any admin keys exist
 *
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<boolean>} True if admin keys exist
 */
export async function adminKeysExist(env) {
  // Check if any admin keys exist using the admin index
  const adminKeys = await env.KV.list({ prefix: "index:admin:" });
  return adminKeys && adminKeys.keys && adminKeys.keys.length > 0;
}

/**
 * Set up the first admin
 *
 * @param {Object} adminData - Data for the first admin
 * @param {string} adminData.name - Admin name
 * @param {string} adminData.email - Admin email
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<Object>} The created admin key
 */
export async function setupFirstAdmin(adminData, env) {
  // Check if setup has already been completed
  const setupCompleted = await isSetupCompleted(env);

  if (setupCompleted) {
    throw new Error("Setup has already been completed");
  }

  // Validate required fields
  if (!adminData.name || !adminData.email) {
    throw new Error("Name and email are required for the first admin");
  }

  // Create the first admin with SUPER_ADMIN role
  const adminKey = await createAdminKey({
    name: `${adminData.name} (Super Admin)`,
    owner: adminData.name,
    email: adminData.email,
    role: "SUPER_ADMIN",
    scopes: ADMIN_ROLES.SUPER_ADMIN.scopes,
    metadata: {
      isFirstAdmin: true,
      setupDate: new Date().toISOString(),
    },
  }, env);

  // Mark setup as completed
  await env.KV.put("system:setup_completed", "true");

  // Log the setup event
  await logAdminAction(adminKey.id, "system_setup", {
    adminName: adminData.name,
    adminEmail: adminData.email,
  }, env);

  return adminKey;
}

/**
 * Create a new admin key
 *
 * @param {Object} adminData - Data for the new admin
 * @param {string} adminData.name - Admin name
 * @param {string} adminData.owner - Admin owner (usually same as name)
 * @param {string} adminData.email - Admin email
 * @param {string} adminData.role - Admin role (from ADMIN_ROLES)
 * @param {string[]} [adminData.scopes] - Custom permission scopes (for CUSTOM role)
 * @param {string} [adminData.createdBy] - ID of admin who created this admin
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<Object>} The created admin key
 */
export async function createAdminKey(adminData, env) {
  // Validate required fields
  if (!adminData.name || !adminData.email) {
    throw new Error("Name and email are required for admin creation");
  }

  // Determine scopes based on role
  let scopes;

  if (adminData.role && adminData.role !== "CUSTOM") {
    // Get scopes from predefined role
    const roleInfo = ADMIN_ROLES[adminData.role];

    if (!roleInfo) {
      throw new Error(`Invalid role: ${adminData.role}`);
    }

    scopes = roleInfo.scopes;
  } else if (adminData.scopes && adminData.scopes.length > 0) {
    // Custom role with specific scopes
    scopes = adminData.scopes;

    // Validate that all scopes start with 'admin:'
    const invalidScopes = scopes.filter((scope) => !scope.startsWith("admin:"));
    if (invalidScopes.length > 0) {
      throw new Error(`Invalid admin scopes: ${invalidScopes.join(", ")}`);
    }
  } else {
    throw new Error("Either a valid role or custom scopes must be provided");
  }

  // Create the admin key
  return createApiKey({
    name: adminData.name,
    owner: adminData.owner || adminData.name,
    email: adminData.email,
    scopes: scopes,
    role: adminData.role || "CUSTOM",
    createdBy: adminData.createdBy,
    metadata: {
      isAdmin: true,
      ...adminData.metadata,
    },
  }, env);
}

/**
 * Get all admin keys
 *
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<Array>} Array of admin key objects
 */
export async function listAdminKeys(env) {
  // Get all admin keys using the admin index
  const adminIndices = await env.KV.list({ prefix: "index:admin:" });

  if (!adminIndices || !adminIndices.keys || adminIndices.keys.length === 0) {
    return [];
  }

  // Fetch each admin key
  const adminKeys = await Promise.all(
    adminIndices.keys.map(async (item) => {
      const keyId = item.name.split("index:admin:")[1];
      const keyData = await env.KV.get(`key:${keyId}`);

      if (!keyData) {
        return null;
      }

      return JSON.parse(keyData);
    }),
  );

  // Filter out any nulls (in case keys were deleted)
  return adminKeys.filter((key) => key !== null);
}

/**
 * Get a specific admin key by ID
 *
 * @param {string} adminId - Admin key ID
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<Object|null>} Admin key object or null if not found
 */
export async function getAdminKey(adminId, env) {
  // Check if this is an admin key
  const isAdmin = await env.KV.get(`index:admin:${adminId}`);

  if (!isAdmin) {
    return null;
  }

  // Get the key data
  const keyData = await env.KV.get(`key:${adminId}`);

  if (!keyData) {
    return null;
  }

  return JSON.parse(keyData);
}

/**
 * Revoke an admin key
 *
 * @param {string} adminId - Admin ID to revoke
 * @param {string} revokerId - ID of admin performing the revocation
 * @param {string} reason - Reason for revocation
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<Object>} Revocation result
 */
export async function revokeAdminKey(adminId, revokerId, reason, env) {
  // Get the admin key to revoke
  const adminKey = await getAdminKey(adminId, env);

  if (!adminKey) {
    throw new Error("Admin key not found");
  }

  // Check if already revoked
  if (adminKey.status !== "active") {
    return {
      success: true,
      message: "Admin key is already revoked",
      id: adminId,
    };
  }

  // Update the key
  adminKey.status = "revoked";
  adminKey.revokedAt = Date.now();
  adminKey.revokedBy = revokerId;
  adminKey.revokedReason = reason || "Administrative action";

  // Save the updated key
  await env.KV.put(`key:${adminId}`, JSON.stringify(adminKey));

  // Log the revocation
  await logAdminAction(revokerId, "revoke_admin", {
    revokedAdminId: adminId,
    revokedAdminEmail: adminKey.email,
    reason: reason,
  }, env);

  return {
    success: true,
    message: "Admin key revoked successfully",
    id: adminId,
  };
}
