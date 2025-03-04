import { 
  successResponse, 
  createdResponse, 
  errorResponse, 
  notFoundResponse
} from '../utils/response.js';
import { 
  validateCreateKeyParams, 
  validatePaginationParams,
  validateKeyRotationParams,
  validateCursorParams
} from '../utils/validation.js';

/**
 * Handle list keys request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {URL} url - Request URL with query parameters
 * @returns {Promise<Response>} HTTP response
 */
export async function handleListKeys(keyManager, url) {
  // Extract and validate pagination parameters
  const limit = url.searchParams.get('limit') 
    ? parseInt(url.searchParams.get('limit')) 
    : 100;

  const offset = url.searchParams.get('offset') 
    ? parseInt(url.searchParams.get('offset')) 
    : 0;
  
  const validation = validatePaginationParams(limit, offset);
  
  if (!validation.isValid) {
    return errorResponse('Invalid pagination parameters', 400, validation.errors);
  }
  
  // Get paginated keys
  const result = await keyManager.listKeys({ limit, offset });
  
  // Add pagination headers
  const headers = {
    'X-Total-Count': result.totalItems.toString(),
    'X-Pagination-Limit': result.limit.toString(),
    'X-Pagination-Offset': result.offset.toString()
  };
  
  return successResponse(result.items, { headers });
}

/**
 * Handle create key request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {Request} request - HTTP request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleCreateKey(keyManager, request) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return errorResponse('Invalid JSON in request body', 400);
  }
  
  // Validate request body
  const validation = validateCreateKeyParams(body);
  
  if (!validation.isValid) {
    return errorResponse('Validation failed', 400, validation.errors);
  }
  
  // Create the key
  const apiKey = await keyManager.createKey(body);
  
  // Don't include the hashed key in the response
  const { key: hiddenKey, ...safeKey } = apiKey;
  
  // Return the key with the actual key value (only time it's returned)
  return createdResponse({
    ...safeKey,
    key: apiKey.key
  });
}

/**
 * Handle get key request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {string} keyId - Key ID from the URL
 * @returns {Promise<Response>} HTTP response
 */
export async function handleGetKey(keyManager, keyId) {
  const apiKey = await keyManager.getKey(keyId);
  
  if (!apiKey) {
    return notFoundResponse('API key not found');
  }
  
  // Don't include the actual key in the response
  const { key, ...safeKey } = apiKey;
  
  return successResponse(safeKey);
}

/**
 * Handle revoke key request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {string} keyId - Key ID from the URL
 * @returns {Promise<Response>} HTTP response
 */
export async function handleRevokeKey(keyManager, keyId) {
  const result = await keyManager.revokeKey(keyId);
  
  if (!result.success) {
    if (result.error === 'API key not found') {
      return notFoundResponse(result.error);
    }
    return errorResponse(result.error, 400);
  }
  
  return successResponse(result);
}

/**
 * Handle rotate key request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {string} keyId - Key ID from the URL
 * @param {Request} request - HTTP request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleRotateKey(keyManager, keyId, request) {
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
      return errorResponse('Validation failed', 400, validation.errors);
    }
  }
  
  // Extract rotation options
  const { gracePeriodDays, scopes, name, expiresAt } = body;
  
  // Rotate the key
  const result = await keyManager.rotateKey(keyId, { 
    gracePeriodDays, 
    scopes, 
    name, 
    expiresAt 
  });
  
  if (!result.success) {
    if (result.error === 'API key not found') {
      return notFoundResponse(result.error);
    }
    return errorResponse(result.error, 400);
  }
  
  return successResponse(result);
}

/**
 * Handle list keys with cursor request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {URL} url - Request URL with query parameters
 * @returns {Promise<Response>} HTTP response
 */
export async function handleListKeysWithCursor(keyManager, url) {
  // Extract and validate cursor parameters
  const limit = url.searchParams.get('limit') 
    ? parseInt(url.searchParams.get('limit')) 
    : 100;

  const cursor = url.searchParams.get('cursor') || null;
  const includeRotated = url.searchParams.get('includeRotated') === 'true';
  
  const validation = validateCursorParams(limit, cursor);
  
  if (!validation.isValid) {
    return errorResponse('Invalid pagination parameters', 400, validation.errors);
  }
  
  // Get paginated keys with cursor
  const result = await keyManager.listKeysWithCursor({ 
    limit, 
    cursor,
    includeRotated
  });
  
  // Add pagination headers
  const headers = {
    'X-Pagination-Limit': result.limit.toString(),
    'X-Has-More': result.hasMore.toString()
  };
  
  if (result.nextCursor) {
    headers['X-Next-Cursor'] = result.nextCursor;
  }
  
  return successResponse(result.items, { headers });
}