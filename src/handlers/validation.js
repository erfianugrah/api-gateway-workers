import { successResponse, errorResponse } from '../utils/response.js';
import { isValidApiKey } from '../utils/validation.js';

/**
 * Handle validate key request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @param {Request} request - HTTP request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleValidateKey(keyManager, request) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return errorResponse('Invalid JSON in request body', 400);
  }
  
  // Check for API key in headers first (best practice)
  let apiKey = request.headers.get('X-API-Key');
  
  // Fall back to body if not found in headers
  if (!apiKey && body.key) {
    apiKey = body.key;
  }
  
  if (!apiKey) {
    return errorResponse(
      'API key is required (provide in X-API-Key header or key field in request body)',
      400
    );
  }
  
  // Basic validation before hitting the database
  if (!isValidApiKey(apiKey)) {
    return successResponse({ 
      valid: false, 
      error: 'Invalid API key format'
    });
  }
  
  const requiredScopes = Array.isArray(body.scopes) ? body.scopes : [];
  
  // Validate the key
  const result = await keyManager.validateKey(apiKey, requiredScopes);
  
  // Always return 200 OK for validation requests to prevent information leakage
  // The valid field in the response body indicates if validation passed
  return successResponse(result);
}