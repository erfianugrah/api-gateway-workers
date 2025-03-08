/**
 * Key management handlers
 * Updated to use the auth module for permission checks
 */

import {
  createdResponse,
  errorResponse,
  notFoundResponse,
  successResponse,
} from "../utils/response.js";
import {
  validateCreateKeyParams,
  validateCursorParams,
  validateKeyRotationParams,
  validatePaginationParams,
} from "../utils/validation.js";
import { hasPermission } from "../auth/roles.js";
import { logAdminAction } from "../auth/auditLogger.js";

/**
 * Handle list keys request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {URL} url - Request URL with query parameters
 * @param {Object} adminInfo - Information about the admin making the request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleListKeys(keyManager, url, adminInfo) {
  // Check if admin has permission to list keys
  if (!hasPermission(adminInfo, "admin:keys:read")) {
    return errorResponse("You do not have permission to list API keys", 403);
  }

  // Extract and validate pagination parameters
  const limit = url.searchParams.get("limit")
    ? parseInt(url.searchParams.get("limit"))
    : 100;

  const offset = url.searchParams.get("offset")
    ? parseInt(url.searchParams.get("offset"))
    : 0;

  const validation = validatePaginationParams(limit, offset);

  if (!validation.isValid) {
    return errorResponse(
      "Invalid pagination parameters",
      400,
      validation.errors,
    );
  }

  // Get paginated keys
  const result = await keyManager.listKeys({ limit, offset });

  // Add pagination headers
  const headers = {
    "X-Total-Count": result.totalItems.toString(),
    "X-Pagination-Limit": result.limit.toString(),
    "X-Pagination-Offset": result.offset.toString(),
  };

  // Log this action
  await logAdminAction(adminInfo.keyId, "list_keys", {
    limit,
    offset,
    totalItems: result.totalItems,
  }, keyManager.env);

  return successResponse(result.items, { headers });
}

/**
 * Handle create key request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {Request} request - HTTP request
 * @param {Object} adminInfo - Information about the admin making the request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleCreateKey(keyManager, request, adminInfo) {
  // Check if admin has permission to create keys
  if (!hasPermission(adminInfo, "admin:keys:create")) {
    return errorResponse("You do not have permission to create API keys", 403);
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return errorResponse("Invalid JSON in request body", 400);
  }

  // Validate request body
  const validation = validateCreateKeyParams(body);

  if (!validation.isValid) {
    return errorResponse("Validation failed", 400, validation.errors);
  }

  // Add admin info to the key data
  body.createdBy = adminInfo.keyId;
  body.metadata = {
    ...(body.metadata || {}),
    createdByAdmin: adminInfo.email,
    createdByAdminRole: adminInfo.role,
  };

  // Create the key
  const apiKey = await keyManager.createKey(body);

  // Log this action
  await logAdminAction(adminInfo.keyId, "create_key", {
    keyId: apiKey.id,
    name: body.name,
    owner: body.owner,
    scopes: body.scopes,
  }, keyManager.env);

  // Don't include the hashed key in the response
  const { key: hiddenKey, ...safeKey } = apiKey;

  // Return the key with the actual key value (only time it's returned)
  return createdResponse({
    ...safeKey,
    key: apiKey.key,
  });
}

/**
 * Handle get key request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {string} keyId - Key ID from the URL
 * @param {Object} adminInfo - Information about the admin making the request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleGetKey(keyManager, keyId, adminInfo) {
  // Check if admin has permission to view keys
  if (!hasPermission(adminInfo, "admin:keys:read")) {
    return errorResponse("You do not have permission to view API keys", 403);
  }

  const apiKey = await keyManager.getKey(keyId);

  if (!apiKey) {
    return notFoundResponse("API key not found");
  }

  // Log this action
  await logAdminAction(adminInfo.keyId, "get_key", {
    keyId: keyId,
  }, keyManager.env);

  // Don't include the actual key in the response
  const { key, ...safeKey } = apiKey;

  return successResponse(safeKey);
}

/**
 * Handle revoke key request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {string} keyId - Key ID from the URL
 * @param {Request} request - HTTP request
 * @param {Object} adminInfo - Information about the admin making the request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleRevokeKey(keyManager, keyId, request, adminInfo) {
  // Check if admin has permission to revoke keys
  if (!hasPermission(adminInfo, "admin:keys:revoke")) {
    return errorResponse("You do not have permission to revoke API keys", 403);
  }

  // Extract revocation reason if provided
  let reason = "Administrative action";
  try {
    const body = await request.json();
    if (body && body.reason) {
      reason = body.reason;
    }
  } catch (error) {
    // Ignore JSON parsing errors - use default reason
  }

  const result = await keyManager.revokeKey(keyId);

  if (!result.success) {
    if (result.error === "API key not found") {
      return notFoundResponse(result.error);
    }
    return errorResponse(result.error, 400);
  }

  // Log this action
  await logAdminAction(adminInfo.keyId, "revoke_key", {
    keyId: keyId,
    reason: reason,
  }, keyManager.env);

  return successResponse(result);
}

/**
 * Handle rotate key request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {string} keyId - Key ID from the URL
 * @param {Request} request - HTTP request
 * @param {Object} adminInfo - Information about the admin making the request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleRotateKey(keyManager, keyId, request, adminInfo) {
  // Check if admin has permission to update keys
  if (!hasPermission(adminInfo, "admin:keys:update")) {
    return errorResponse("You do not have permission to rotate API keys", 403);
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    // Allow empty body for default rotation
    body = {};
  }

  // Validate request body if provided
  if (Object.keys(body).length > 0) {
    const validation = validateKeyRotationParams(body);

    if (!validation.isValid) {
      return errorResponse("Validation failed", 400, validation.errors);
    }
  }

  // Extract rotation options
  const { gracePeriodDays, scopes, name, expiresAt } = body;

  // Rotate the key
  const result = await keyManager.rotateKey(keyId, {
    gracePeriodDays,
    scopes,
    name,
    expiresAt,
    rotatedBy: adminInfo.keyId,
  });

  if (!result.success) {
    if (result.error === "API key not found") {
      return notFoundResponse(result.error);
    }
    return errorResponse(result.error, 400);
  }

  // Log this action
  await logAdminAction(adminInfo.keyId, "rotate_key", {
    keyId: keyId,
    newKeyId: result.newKey.id,
    gracePeriodDays,
  }, keyManager.env);

  return successResponse(result);
}

/**
 * Handle list keys with cursor request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {URL} url - Request URL with query parameters
 * @param {Object} adminInfo - Information about the admin making the request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleListKeysWithCursor(keyManager, url, adminInfo) {
  // Check if admin has permission to list keys
  if (!hasPermission(adminInfo, "admin:keys:read")) {
    return errorResponse("You do not have permission to list API keys", 403);
  }

  // Extract and validate cursor parameters
  const limit = url.searchParams.get("limit")
    ? parseInt(url.searchParams.get("limit"))
    : 100;

  const cursor = url.searchParams.get("cursor") || null;
  const includeRotated = url.searchParams.get("includeRotated") === "true";

  const validation = validateCursorParams(limit, cursor);

  if (!validation.isValid) {
    return errorResponse(
      "Invalid pagination parameters",
      400,
      validation.errors,
    );
  }

  // Get paginated keys with cursor
  const result = await keyManager.listKeysWithCursor({
    limit,
    cursor,
    includeRotated,
  });

  // Add pagination headers
  const headers = {
    "X-Pagination-Limit": result.limit.toString(),
    "X-Has-More": result.hasMore.toString(),
  };

  if (result.nextCursor) {
    headers["X-Next-Cursor"] = result.nextCursor;
  }

  // Log this action
  await logAdminAction(adminInfo.keyId, "list_keys_cursor", {
    limit,
    includeRotated,
    itemCount: result.items.length,
  }, keyManager.env);

  return successResponse(result.items, { headers });
}
