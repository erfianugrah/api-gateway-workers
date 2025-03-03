import { 
  successResponse, 
  createdResponse, 
  errorResponse, 
  notFoundResponse
} from '../utils/response.js';
import { validateCreateKeyParams, validatePaginationParams } from '../utils/validation.js';

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