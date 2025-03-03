import { DurableObject } from 'cloudflare:workers';
import { Router } from './router.js';
import { ApiKeyManager } from '../models/ApiKeyManager.js';
import { 
  handleListKeys, 
  handleCreateKey, 
  handleGetKey, 
  handleRevokeKey 
} from '../handlers/keys.js';
import { handleValidateKey } from '../handlers/validation.js';
import { handleHealthCheck, handleCleanup } from '../handlers/system.js';

/**
 * KeyManagerDurableObject is the main Durable Object for the API key manager
 */
export class KeyManagerDurableObject extends DurableObject {
  /**
   * Initialize the KeyManagerDurableObject
   *
   * @param {DurableObjectState} state - Durable Object state
   * @param {Env} env - Environment bindings
   */
  constructor(state, env) {
    super(state, env);
    this.state = state;
    this.env = env;
    
    // Initialize API Key Manager
    this.keyManager = new ApiKeyManager(state.storage);
    
    // Initialize router
    this.router = new Router();
    
    // Register routes
    this.setupRoutes();
    
    // Set up periodic cleanup
    this.setupMaintenance();
  }
  
  /**
   * Set up route handlers
   */
  setupRoutes() {
    // API key management routes
    this.router.add('GET', '/keys', (req, ctx) => 
      handleListKeys(this.keyManager, new URL(req.url))
    );
    
    this.router.add('POST', '/keys', (req, ctx) => 
      handleCreateKey(this.keyManager, req)
    );
    
    this.router.add('GET', '/keys/:id', (req, ctx) => 
      handleGetKey(this.keyManager, ctx.params.id)
    );
    
    this.router.add('DELETE', '/keys/:id', (req, ctx) => 
      handleRevokeKey(this.keyManager, ctx.params.id)
    );
    
    // Validation route
    this.router.add('POST', '/validate', (req, ctx) => 
      handleValidateKey(this.keyManager, req)
    );
    
    // System routes
    this.router.add('GET', '/health', () => 
      handleHealthCheck()
    );
    
    this.router.add('POST', '/maintenance/cleanup', () => 
      handleCleanup(this.keyManager)
    );
  }
  
  /**
   * Set up periodic maintenance tasks
   */
  setupMaintenance() {
    // Make sure setAlarm is supported (may not be in local dev environment)
    if (typeof this.state.setAlarm === 'function') {
      // Set up daily alarm for cleanup
      this.state.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
    } else {
      console.log('Alarms not supported in this environment - scheduled maintenance disabled');
    }
  }
  
  /**
   * Handle alarms for maintenance tasks
   */
  async alarm() {
    try {
      // Clean up expired keys
      await this.keyManager.cleanupExpiredKeys();
      
      // Schedule next alarm if supported
      if (typeof this.state.setAlarm === 'function') {
        this.state.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
      }
    } catch (error) {
      console.error('Error in alarm handler:', error);
      
      // Retry sooner if there was an error and if alarms are supported
      if (typeof this.state.setAlarm === 'function') {
        this.state.setAlarm(Date.now() + 60 * 60 * 1000); // 1 hour retry
      }
    }
  }
  
  /**
   * Handle fetch requests
   *
   * @param {Request} request - HTTP request
   * @returns {Promise<Response>} HTTP response
   */
  async fetch(request) {
    return this.router.handle(request, {
      storage: this.state.storage,
      env: this.env
    });
  }
}