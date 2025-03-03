import { successResponse } from '../utils/response.js';

/**
 * Handle health check request
 *
 * @returns {Promise<Response>} HTTP response
 */
export async function handleHealthCheck() {
  return successResponse({ 
    status: 'healthy', 
    version: '1.0.0',
    timestamp: Date.now()
  }, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

/**
 * Handle cleanup request
 *
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @returns {Promise<Response>} HTTP response
 */
export async function handleCleanup(keyManager) {
  const result = await keyManager.cleanupExpiredKeys();
  return successResponse(result);
}