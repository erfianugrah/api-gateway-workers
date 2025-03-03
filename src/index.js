import { KeyManagerDurableObject } from './lib/KeyManagerDurableObject.js';
import { successResponse, errorResponse } from './utils/response.js';

/**
 * @typedef {Object} Env
 * @property {DurableObjectNamespace} KEY_MANAGER - The Key Manager Durable Object namespace binding
 */

// Export DurableObject class
export { KeyManagerDurableObject };

/**
 * Worker entry point
 */
export default {
  /**
   * Main fetch handler for the Worker
   *
   * @param {Request} request - The HTTP request
   * @param {Env} env - Environment bindings
   * @param {ExecutionContext} ctx - Execution context
   * @returns {Promise<Response>} HTTP response
   */
  async fetch(request, env, ctx) {
    try {
      // Check required bindings
      if (!env.KEY_MANAGER) {
        return errorResponse('Service misconfigured: KEY_MANAGER binding not found', 500);
      }
      
      // Quick health check that doesn't hit the Durable Object
      const url = new URL(request.url);
      if (url.pathname === '/health') {
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
      
      // Forward to the Durable Object with a consistent ID
      const id = env.KEY_MANAGER.idFromName('global');
      const keyManager = env.KEY_MANAGER.get(id);
      
      // Add request timeout
      const timeoutMs = 10000; // 10 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await keyManager.fetch(request.clone(), {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          return errorResponse('Request timed out', 504);
        }
        
        console.error('Error forwarding request:', error);
        return errorResponse('An unexpected error occurred', 500);
      }
    } catch (error) {
      console.error('Unhandled worker error:', error);
      return errorResponse('An unexpected error occurred', 500);
    }
  }
};
