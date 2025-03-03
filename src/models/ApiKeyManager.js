import { getKeyStorageId, getLookupStorageId } from '../utils/storage.js';
import { generateApiKey } from '../utils/security.js';
import { isValidUuid } from '../utils/validation.js';

/**
 * Class that handles API key operations
 */
export class ApiKeyManager {
  /**
   * Create a new ApiKeyManager
   * 
   * @param {DurableObjectStorage} storage - Storage interface
   */
  constructor(storage) {
    this.storage = storage;
  }
  
  /**
   * Create a new API key
   * 
   * @param {CreateKeyRequest} keyData - Key creation data
   * @returns {Promise<ApiKey>} The created API key
   */
  async createKey(keyData) {
    // Validate incoming data
    if (!keyData || !keyData.name || !keyData.owner || !Array.isArray(keyData.scopes)) {
      throw new Error("Invalid key data: name, owner, and scopes are required");
    }
    
    // Generate a secure API key
    const key = generateApiKey();
    
    // Create a unique ID for the key
    const id = crypto.randomUUID();
    
    // Apply reasonable limits to prevent abuse
    const MAX_NAME_LENGTH = 255;
    const MAX_OWNER_LENGTH = 255;
    const MAX_SCOPE_LENGTH = 100;
    const MAX_SCOPES = 50;
    
    const apiKey = {
      id,
      key,
      name: keyData.name.trim().substring(0, MAX_NAME_LENGTH),
      owner: keyData.owner.trim().substring(0, MAX_OWNER_LENGTH),
      scopes: keyData.scopes
        .slice(0, MAX_SCOPES)
        .map(scope => (scope?.trim() || "").substring(0, MAX_SCOPE_LENGTH))
        .filter(scope => scope.length > 0),
      status: 'active',
      createdAt: Date.now(),
      expiresAt: keyData.expiresAt || 0,
      lastUsedAt: 0
    };
    
    // Ensure at least one scope exists
    if (apiKey.scopes.length === 0) {
      throw new Error("At least one valid scope is required");
    }

    try {
      // Store the API key
      await this.storage.put(getKeyStorageId(id), apiKey);
      
      // Store a lookup by key value for faster validation
      await this.storage.put(getLookupStorageId(key), id);
      
      return apiKey;
    } catch (error) {
      // Attempt to clean up if first part succeeded but second failed
      try {
        await this.storage.delete(getKeyStorageId(id));
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Get an API key by ID
   * 
   * @param {string} keyId - ID of the API key
   * @returns {Promise<ApiKey|null>} The API key or null if not found
   */
  async getKey(keyId) {
    if (!isValidUuid(keyId)) {
      return null;
    }
    
    return this.storage.get(getKeyStorageId(keyId));
  }

  /**
   * List API keys with pagination
   * 
   * @param {Object} options - List options
   * @param {number} options.limit - Maximum number of keys to return
   * @param {number} options.offset - Number of keys to skip
   * @returns {Promise<Object>} Paginated keys and metadata
   */
  async listKeys({ limit = 100, offset = 0 } = {}) {
    // Get all keys (we'll handle pagination in memory)
    const keys = await this.storage.list({ prefix: 'key:' });
    const totalKeys = keys.size;
    
    // Convert to array for pagination
    let keyArray = [...keys.entries()];
    
    // Sort by creation date (newest first)
    keyArray.sort((a, b) => b[1].createdAt - a[1].createdAt);
    
    // Apply offset and limit
    keyArray = keyArray.slice(offset, offset + limit);
    
    // Process the paginated results
    const items = keyArray.map(([_, value]) => {
      // Don't include the actual key in the response
      const { key, ...safeKey } = value;
      return safeKey;
    });
    
    return {
      items,
      totalItems: totalKeys,
      limit,
      offset
    };
  }

  /**
   * Revoke an API key
   * 
   * @param {string} keyId - ID of the API key to revoke
   * @returns {Promise<Object>} Result with success status and message
   */
  async revokeKey(keyId) {
    if (!isValidUuid(keyId)) {
      return { 
        success: false, 
        error: 'Invalid API key ID format' 
      };
    }
    
    try {
      const apiKey = await this.storage.get(getKeyStorageId(keyId));
      
      if (!apiKey) {
        return { 
          success: false, 
          error: 'API key not found' 
        };
      }
      
      // If the key is already revoked, return early
      if (apiKey.status === 'revoked') {
        return { 
          success: true, 
          message: 'API key is already revoked',
          id: keyId,
          name: apiKey.name
        };
      }
  
      // Update the key status to revoked
      apiKey.status = 'revoked';
      await this.storage.put(getKeyStorageId(keyId), apiKey);
      
      // DO NOT remove the lookup entry - we need it to properly report revoked status
      // instead of just "invalid key" when validation attempts are made
      
      return { 
        success: true, 
        message: 'API key revoked successfully',
        id: keyId,
        name: apiKey.name,
        revokedAt: Date.now()
      };
    } catch (error) {
      console.error(`Error revoking key ${keyId}:`, error);
      return {
        success: false,
        error: `Failed to revoke key: ${error.message}`
      };
    }
  }

  /**
   * Find and validate an API key
   * 
   * @param {string} apiKey - The API key to validate
   * @param {string[]} requiredScopes - Optional scopes to check
   * @returns {Promise<ValidationResult>} Validation result
   */
  async validateKey(apiKey, requiredScopes = []) {
    if (!apiKey) {
      return { 
        valid: false, 
        error: 'API key is required' 
      };
    }
    
    if (!apiKey.startsWith('km_')) {
      return { 
        valid: false, 
        error: 'Invalid API key format' 
      };
    }

    // Use the lookup index for faster validation
    const keyId = await this.storage.get(getLookupStorageId(apiKey));
    
    if (!keyId) {
      return { 
        valid: false, 
        error: 'Invalid API key' 
      };
    }
    
    // Get the full key details
    const foundKey = await this.storage.get(getKeyStorageId(keyId));
    
    if (!foundKey) {
      // This should never happen if our database is consistent
      // If it does, the lookup entry is stale and should be removed
      await this.storage.delete(getLookupStorageId(apiKey));
      
      return { 
        valid: false, 
        error: 'Invalid API key' 
      };
    }

    // Check if the key is active
    if (foundKey.status !== 'active') {
      return { 
        valid: false, 
        error: 'API key is revoked' 
      };
    }

    // Check if the key has expired
    if (foundKey.expiresAt > 0 && foundKey.expiresAt < Date.now()) {
      // Auto-revoke expired keys
      foundKey.status = 'revoked';
      await this.storage.put(getKeyStorageId(keyId), foundKey);
      
      return { 
        valid: false, 
        error: 'API key has expired' 
      };
    }

    // Check if the key has the required scopes
    if (requiredScopes.length > 0) {
      // Convert all scopes to lowercase for case-insensitive matching
      const normalizedKeyScopes = foundKey.scopes.map(s => s.toLowerCase());
      const normalizedRequiredScopes = requiredScopes.map(s => s.toLowerCase());
      
      const hasRequiredScopes = normalizedRequiredScopes.every(
        scope => normalizedKeyScopes.includes(scope)
      );
      
      if (!hasRequiredScopes) {
        return { 
          valid: false, 
          error: 'API key does not have the required scopes',
          requiredScopes,
          providedScopes: foundKey.scopes
        };
      }
    }

    // Update last used timestamp (don't await to make validation faster)
    foundKey.lastUsedAt = Date.now();
    this.storage.put(getKeyStorageId(keyId), foundKey)
      .catch(error => console.error('Failed to update lastUsedAt timestamp:', error));

    // Return success with minimal information
    return { 
      valid: true,
      owner: foundKey.owner,
      scopes: foundKey.scopes,
      keyId: keyId
    };
  }
  
  /**
   * Clean up expired keys and stale lookup entries
   * 
   * @returns {Promise<Object>} Cleanup result with count of revoked keys and removed lookups
   */
  async cleanupExpiredKeys() {
    const now = Date.now();
    const keys = await this.storage.list({ prefix: 'key:' });
    let revokedCount = 0;
    let staleCount = 0;
    const lookupsToClear = [];
    
    // First pass: find and revoke expired keys
    for (const [keyPath, value] of keys) {
      if (!value) continue; // Skip invalid entries
      
      // Check if the key has expired and isn't already revoked
      if (value.expiresAt > 0 && value.expiresAt < now && value.status === 'active') {
        try {
          // Revoke the key
          value.status = 'revoked';
          await this.storage.put(keyPath, value);
          revokedCount++;
          
          // Track the lookup to be removed
          if (value.key) {
            lookupsToClear.push(getLookupStorageId(value.key));
          }
        } catch (error) {
          console.error(`Failed to revoke expired key ${keyPath}:`, error);
        }
      }
    }
    
    // Second pass: find and remove stale lookup entries
    const lookups = await this.storage.list({ prefix: 'lookup:' });
    for (const [lookupPath, keyId] of lookups) {
      if (!keyId) {
        // Remove invalid lookup entries
        try {
          await this.storage.delete(lookupPath);
          staleCount++;
        } catch (error) {
          console.error(`Failed to remove stale lookup ${lookupPath}:`, error);
        }
        continue;
      }
      
      // Check if the key exists and is active
      try {
        const key = await this.storage.get(getKeyStorageId(keyId));
        if (!key || key.status !== 'active') {
          // If key doesn't exist or is revoked, remove the lookup
          await this.storage.delete(lookupPath);
          staleCount++;
        }
      } catch (error) {
        console.error(`Failed to check key for lookup ${lookupPath}:`, error);
      }
    }
    
    // Remove lookups for the keys we just revoked
    for (const lookupPath of lookupsToClear) {
      try {
        await this.storage.delete(lookupPath);
        staleCount++;
      } catch (error) {
        console.error(`Failed to remove lookup ${lookupPath}:`, error);
      }
    }
    
    return {
      revokedCount,
      staleCount,
      timestamp: now
    };
  }
}