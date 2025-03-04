import { 
  getKeyStorageId, 
  getLookupStorageId, 
  getHmacStorageId, 
  getKeyIndexEntry, 
  getKeyIdFromIndexEntry,
  getRotationStorageId,
  encodeCursor, 
  decodeCursor,
  STORAGE_PREFIXES 
} from '../utils/storage.js';
import { 
  generateApiKey, 
  encryptData, 
  decryptData, 
  generateHmac,
  verifyHmac
} from '../utils/security.js';
import { isValidUuid } from '../utils/validation.js';

/**
 * Class that handles API key operations
 */
export class ApiKeyManager {
  /**
   * Create a new ApiKeyManager
   * 
   * @param {DurableObjectStorage} storage - Storage interface
   * @param {Object} env - Environment variables including encryption keys
   */
  constructor(storage, env = {}) {
    this.storage = storage;
    this.env = env;
    this.encryptionKey = env.ENCRYPTION_KEY || 'default-encryption-key-for-development';
    this.hmacSecret = env.HMAC_SECRET || 'default-hmac-secret-key-for-development';
    this.isTestMode = env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test';
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
    
    const createdAt = Date.now();
    
    const apiKey = {
      id,
      name: keyData.name.trim().substring(0, MAX_NAME_LENGTH),
      owner: keyData.owner.trim().substring(0, MAX_OWNER_LENGTH),
      scopes: keyData.scopes
        .slice(0, MAX_SCOPES)
        .map(scope => (scope?.trim() || "").substring(0, MAX_SCOPE_LENGTH))
        .filter(scope => scope.length > 0),
      status: 'active',
      createdAt,
      expiresAt: keyData.expiresAt || 0,
      lastUsedAt: 0,
      encryptedKey: null,  // Will be set below
      rotatedFromId: null,
      version: 1  // For future schema changes
    };
    
    // Ensure at least one scope exists
    if (apiKey.scopes.length === 0) {
      throw new Error("At least one valid scope is required");
    }

    try {
      // Generate HMAC signature for additional validation security
      const hmacSignature = await generateHmac(id, this.hmacSecret, this.isTestMode);
      
      // Encrypt the key value for storage
      const encryptedKey = await encryptData(key, this.encryptionKey, this.isTestMode);
      apiKey.encryptedKey = encryptedKey;
      
      // Store values atomically
      const tx = this.storage.transaction();
      
      // Store the API key object
      tx.put(getKeyStorageId(id), apiKey);
      
      // Store the HMAC signature for validation
      tx.put(getHmacStorageId(key), hmacSignature);
      
      // Store a lookup by key value for faster validation
      tx.put(getLookupStorageId(key), id);
      
      // Store a sortable index entry for pagination
      tx.put(getKeyIndexEntry(id, createdAt), id);
      
      // Commit all operations atomically
      await tx.commit();
      
      // Return the full key (including the plaintext key) to the caller
      // This is the only time the plaintext key will be returned
      return {
        ...apiKey,
        key
      };
    } catch (error) {
      console.error("Error creating API key:", error);
      throw new Error(`Failed to create API key: ${error.message}`);
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
    
    const apiKey = await this.storage.get(getKeyStorageId(keyId));
    
    // If the key doesn't exist, return null
    if (!apiKey) {
      return null;
    }
    
    // Check for rotated keys and include their information
    let rotationInfo = null;
    if (apiKey.status === 'rotated') {
      rotationInfo = await this.storage.get(getRotationStorageId(keyId));
    }
    
    // Create a safe copy without sensitive data
    const safeKey = { ...apiKey };
    delete safeKey.encryptedKey; // Remove sensitive data
    
    // Add rotation info if available
    if (rotationInfo) {
      safeKey.rotationInfo = {
        newKeyId: rotationInfo.newKeyId,
        rotatedAt: rotationInfo.rotatedAt,
        gracePeriodEnds: rotationInfo.gracePeriodEnds
      };
    }
    
    return safeKey;
  }

  /**
   * List API keys with pagination using offset
   * (Maintained for backward compatibility)
   * 
   * @param {Object} options - List options
   * @param {number} options.limit - Maximum number of keys to return
   * @param {number} options.offset - Number of keys to skip
   * @returns {Promise<Object>} Paginated keys and metadata
   */
  async listKeys({ limit = 100, offset = 0 } = {}) {
    // Get all keys (we'll handle pagination in memory)
    const keys = await this.storage.list({ prefix: STORAGE_PREFIXES.KEY });
    const totalKeys = keys.size;
    
    // Convert to array for pagination
    let keyArray = [...keys.entries()];
    
    // Sort by creation date (newest first)
    keyArray.sort((a, b) => b[1].createdAt - a[1].createdAt);
    
    // Apply offset and limit
    keyArray = keyArray.slice(offset, offset + limit);
    
    // Process the paginated results
    const items = keyArray.map(([_, value]) => {
      // Create a safe copy without sensitive data
      const safeKey = { ...value };
      delete safeKey.encryptedKey; // Remove sensitive data
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
   * List API keys with cursor-based pagination (more efficient)
   * 
   * @param {Object} options - List options
   * @param {number} options.limit - Maximum number of keys to return
   * @param {string} options.cursor - Cursor for pagination (optional)
   * @param {boolean} options.includeRotated - Whether to include rotated keys (default: false)
   * @returns {Promise<Object>} Paginated keys and metadata with next cursor
   */
  async listKeysWithCursor({ limit = 100, cursor = null, includeRotated = false } = {}) {
    let startAfter = null;
    
    // Decode cursor if provided
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (cursorData && cursorData.id && cursorData.ts) {
        startAfter = getKeyIndexEntry(cursorData.id, cursorData.ts);
      }
    }
    
    // Query the index entries for pagination
    const indexEntries = await this.storage.list({
      prefix: STORAGE_PREFIXES.KEY_INDEX,
      start: startAfter ? startAfter + '\0' : undefined, // Start after the last seen key
      limit: limit + 1 // Fetch one extra to determine if there are more results
    });
    
    // Check if we have more entries beyond the requested limit
    const hasMore = indexEntries.size > limit;
    
    // Get the actual entries up to the limit
    const entryArray = [...indexEntries.entries()].slice(0, limit);
    
    // Fetch the actual API keys based on the index entries
    const keyPromises = entryArray.map(async ([indexKey, keyId]) => {
      const apiKey = await this.storage.get(getKeyStorageId(keyId));
      
      if (!apiKey) {
        return null; // Key might have been deleted
      }
      
      // Skip rotated keys if includeRotated is false
      if (!includeRotated && apiKey.status === 'rotated') {
        return null;
      }
      
      // Create a safe copy without sensitive data
      const safeKey = { ...apiKey };
      delete safeKey.encryptedKey; // Remove sensitive data
      return safeKey;
    });
    
    // Wait for all promises to resolve
    const keys = (await Promise.all(keyPromises)).filter(key => key !== null);
    
    // Generate next cursor if we have more results
    let nextCursor = null;
    if (hasMore && entryArray.length > 0) {
      const lastEntry = entryArray[entryArray.length - 1];
      const lastKeyId = lastEntry[1];
      const lastKey = await this.storage.get(getKeyStorageId(lastKeyId));
      const lastTimestamp = lastKey ? lastKey.createdAt : Date.now();
      nextCursor = encodeCursor(lastKeyId, lastTimestamp);
    }
    
    return {
      items: keys,
      limit,
      hasMore,
      nextCursor
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
      
      const revokedAt = Date.now();
      
      // Use a transaction to ensure changes are atomic
      const tx = this.storage.transaction();
      
      // Update the key status to revoked
      apiKey.status = 'revoked';
      apiKey.revokedAt = revokedAt;
      tx.put(getKeyStorageId(keyId), apiKey);
      
      // For rotated keys, also revoke any active rotation
      if (apiKey.status === 'rotated') {
        const rotationInfo = await this.storage.get(getRotationStorageId(keyId));
        if (rotationInfo && rotationInfo.newKeyId) {
          // Revoke the new key too
          tx.delete(getRotationStorageId(keyId));
          
          // Try to revoke the new key as well
          try {
            const newKey = await this.storage.get(getKeyStorageId(rotationInfo.newKeyId));
            if (newKey && newKey.status === 'active') {
              newKey.status = 'revoked';
              newKey.revokedAt = revokedAt;
              tx.put(getKeyStorageId(rotationInfo.newKeyId), newKey);
            }
          } catch (error) {
            console.error(`Failed to revoke rotated key ${rotationInfo.newKeyId}:`, error);
          }
        }
      }
      
      // Commit the transaction
      await tx.commit();
      
      // DO NOT remove the lookup entries yet - we need them to properly report revoked status
      // These will be cleaned up by the maintenance task
      
      return { 
        success: true, 
        message: 'API key revoked successfully',
        id: keyId,
        name: apiKey.name,
        revokedAt
      };
    } catch (error) {
      console.error(`Error revoking key ${keyId}:`, error);
      
      // Try again with retry logic (up to 3 attempts)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Retrying key revocation (attempt ${attempt})...`);
          
          // Wait a bit between retries
          await new Promise(resolve => setTimeout(resolve, 200 * attempt));
          
          const apiKey = await this.storage.get(getKeyStorageId(keyId));
          if (!apiKey) {
            return { success: false, error: 'API key not found' };
          }
          
          if (apiKey.status === 'revoked') {
            return {
              success: true,
              message: 'API key is already revoked',
              id: keyId,
              name: apiKey.name
            };
          }
          
          apiKey.status = 'revoked';
          apiKey.revokedAt = Date.now();
          await this.storage.put(getKeyStorageId(keyId), apiKey);
          
          return {
            success: true,
            message: 'API key revoked successfully (retry)',
            id: keyId,
            name: apiKey.name,
            revokedAt: apiKey.revokedAt
          };
        } catch (retryError) {
          console.error(`Retry ${attempt} failed:`, retryError);
        }
      }
      
      return {
        success: false,
        error: `Failed to revoke key after retries: ${error.message}`
      };
    }
  }
  
  /**
   * Rotate an API key (create a new key and deprecate the old one)
   * 
   * @param {string} keyId - ID of the API key to rotate
   * @param {Object} options - Rotation options
   * @param {number} options.gracePeriodDays - Grace period in days for the old key (default: 30)
   * @param {Array} options.scopes - Updated scopes for the new key (optional)
   * @param {string} options.name - Updated name for the new key (optional)
   * @param {number} options.expiresAt - Updated expiration for the new key (optional)
   * @returns {Promise<Object>} The rotation result with both old and new key details
   */
  async rotateKey(keyId, { gracePeriodDays = 30, scopes, name, expiresAt } = {}) {
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
      
      // Only active keys can be rotated
      if (apiKey.status !== 'active') {
        return {
          success: false,
          error: `Cannot rotate key with status: ${apiKey.status}`
        };
      }
      
      // Check if the key is already in the process of being rotated
      const existingRotation = await this.storage.get(getRotationStorageId(keyId));
      if (existingRotation) {
        return {
          success: false,
          error: 'Key is already in the process of being rotated',
          newKeyId: existingRotation.newKeyId
        };
      }
      
      // Validate grace period
      const gracePeriodMs = Math.max(0, Math.min(gracePeriodDays, 90)) * 24 * 60 * 60 * 1000;
      const rotatedAt = Date.now();
      const gracePeriodEnds = rotatedAt + gracePeriodMs;
      
      // Prepare data for the new key
      const newKeyData = {
        name: name || apiKey.name,
        owner: apiKey.owner,
        scopes: scopes || apiKey.scopes,
        expiresAt: expiresAt || apiKey.expiresAt
      };
      
      // Create a new key (reusing most properties from the original)
      const newApiKey = await this.createKey(newKeyData);
      
      // Update the original key to mark it as rotated
      apiKey.status = 'rotated';
      apiKey.rotatedAt = rotatedAt;
      apiKey.rotatedToId = newApiKey.id;
      
      // Store rotation information to track the grace period
      const rotationInfo = {
        originalKeyId: keyId,
        newKeyId: newApiKey.id,
        rotatedAt,
        gracePeriodEnds,
        status: 'active'
      };
      
      // Update the new key to mark it as a rotation
      newApiKey.rotatedFromId = keyId;
      
      // Use a transaction to ensure all operations are atomic
      const tx = this.storage.transaction();
      
      // Update the original key
      tx.put(getKeyStorageId(keyId), apiKey);
      
      // Store the rotation information
      tx.put(getRotationStorageId(keyId), rotationInfo);
      
      // Update the new key with rotation info
      delete newApiKey.key; // Remove plaintext key before storing
      tx.put(getKeyStorageId(newApiKey.id), newApiKey);
      
      // Commit all changes
      await tx.commit();
      
      // Return the result
      return {
        success: true,
        message: 'API key rotated successfully',
        originalKey: {
          id: keyId,
          name: apiKey.name,
          status: 'rotated',
          rotatedAt,
          gracePeriodEnds
        },
        newKey: {
          id: newApiKey.id,
          key: newApiKey.key, // Include the new plaintext key
          name: newApiKey.name,
          status: 'active',
          createdAt: newApiKey.createdAt
        }
      };
    } catch (error) {
      console.error(`Error rotating key ${keyId}:`, error);
      return {
        success: false,
        error: `Failed to rotate key: ${error.message}`
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

    try {
      // Use the lookup index for faster validation
      const keyId = await this.storage.get(getLookupStorageId(apiKey));
      
      if (!keyId) {
        return { 
          valid: false, 
          error: 'Invalid API key' 
        };
      }
      
      // Verify the HMAC signature for additional security
      const storedHmac = await this.storage.get(getHmacStorageId(apiKey));
      if (storedHmac) {
        const isValidHmac = await verifyHmac(keyId, storedHmac, this.hmacSecret, this.isTestMode);
        if (!isValidHmac) {
          console.error(`HMAC verification failed for key ${keyId}`);
          return {
            valid: false,
            error: 'API key signature verification failed'
          };
        }
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
      
      // Check key status
      if (foundKey.status === 'revoked') {
        return { 
          valid: false, 
          error: 'API key is revoked' 
        };
      }
      
      // Check for rotated keys - during grace period, both old and new keys are valid
      if (foundKey.status === 'rotated') {
        const rotationInfo = await this.storage.get(getRotationStorageId(keyId));
        
        // If the rotation grace period has expired, the key is no longer valid
        if (!rotationInfo || Date.now() > rotationInfo.gracePeriodEnds) {
          return {
            valid: false,
            error: 'API key has been rotated and grace period has expired',
            rotatedToId: foundKey.rotatedToId
          };
        }
        
        // During grace period, return a warning but still validate
        const warningMessage = `This API key has been rotated. Please switch to the new key before ${new Date(rotationInfo.gracePeriodEnds).toISOString()}`;
        
        console.log(`Rotated key used during grace period: ${keyId}`);
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

      // Prepare the validation result
      const validationResult = { 
        valid: true,
        owner: foundKey.owner,
        scopes: foundKey.scopes,
        keyId: keyId
      };
      
      // Add warning for rotated keys
      if (foundKey.status === 'rotated') {
        const rotationInfo = await this.storage.get(getRotationStorageId(keyId));
        if (rotationInfo) {
          validationResult.warning = `This API key has been rotated. Please switch to the new key before ${new Date(rotationInfo.gracePeriodEnds).toISOString()}`;
          validationResult.rotatedToId = foundKey.rotatedToId;
          validationResult.gracePeriodEnds = rotationInfo.gracePeriodEnds;
        }
      }

      return validationResult;
    } catch (error) {
      console.error(`Error validating API key:`, error);
      
      // Implement read-through cache for frequently validated keys
      // This would go here in a production implementation
      
      return {
        valid: false,
        error: `Validation error: ${error.message}`
      };
    }
  }
  
  /**
   * Clean up expired keys and stale lookup entries
   * 
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupExpiredKeys() {
    const now = Date.now();
    const keys = await this.storage.list({ prefix: STORAGE_PREFIXES.KEY });
    let revokedCount = 0;
    let staleCount = 0;
    let rotationCount = 0;
    const lookupsToClear = [];
    const hmacsToClear = [];
    
    const tx = this.storage.transaction();
    
    // First pass: find and revoke expired keys
    for (const [keyPath, value] of keys) {
      if (!value) continue; // Skip invalid entries
      
      // Check for expired keys
      if (value.expiresAt > 0 && value.expiresAt < now && value.status === 'active') {
        try {
          // Revoke the key
          value.status = 'revoked';
          value.revokedAt = now;
          tx.put(keyPath, value);
          revokedCount++;
          
          // Track the lookup to be removed
          if (value.encryptedKey && value.encryptedKey.encryptedData) {
            try {
              const decryptedKey = await decryptData(value.encryptedKey, this.encryptionKey, this.isTestMode);
              lookupsToClear.push(getLookupStorageId(decryptedKey));
              hmacsToClear.push(getHmacStorageId(decryptedKey));
            } catch (error) {
              console.error(`Failed to decrypt key for cleanup ${keyPath}:`, error);
            }
          }
        } catch (error) {
          console.error(`Failed to revoke expired key ${keyPath}:`, error);
        }
      }
      
      // Check for rotated keys with expired grace periods
      if (value.status === 'rotated') {
        try {
          const rotationInfo = await this.storage.get(getRotationStorageId(value.id));
          
          if (rotationInfo && rotationInfo.gracePeriodEnds < now) {
            // Grace period has expired, clean up the rotation
            tx.delete(getRotationStorageId(value.id));
            
            // We don't need to update the key status as it's already 'rotated'
            rotationCount++;
            
            // Track the lookup to be removed
            if (value.encryptedKey && value.encryptedKey.encryptedData) {
              try {
                const decryptedKey = await decryptData(value.encryptedKey, this.encryptionKey, this.isTestMode);
                lookupsToClear.push(getLookupStorageId(decryptedKey));
                hmacsToClear.push(getHmacStorageId(decryptedKey));
              } catch (error) {
                console.error(`Failed to decrypt key for cleanup ${keyPath}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to check rotation info for ${keyPath}:`, error);
        }
      }
    }
    
    // Second pass: find and remove stale lookup entries
    const lookups = await this.storage.list({ prefix: STORAGE_PREFIXES.LOOKUP });
    for (const [lookupPath, keyId] of lookups) {
      if (!keyId) {
        // Remove invalid lookup entries
        tx.delete(lookupPath);
        staleCount++;
        continue;
      }
      
      // Check if the key exists and is active
      try {
        const key = await this.storage.get(getKeyStorageId(keyId));
        if (!key || key.status !== 'active') {
          // If key doesn't exist or is not active, remove the lookup
          tx.delete(lookupPath);
          staleCount++;
        }
      } catch (error) {
        console.error(`Failed to check key for lookup ${lookupPath}:`, error);
      }
    }
    
    // Also check for stale HMAC entries
    const hmacs = await this.storage.list({ prefix: STORAGE_PREFIXES.HMAC });
    for (const [hmacPath, _] of hmacs) {
      // Extract the key from the hmac path
      const apiKey = hmacPath.substring(STORAGE_PREFIXES.HMAC.length);
      
      // Check if there's a corresponding lookup
      const keyId = await this.storage.get(getLookupStorageId(apiKey));
      if (!keyId) {
        // If there's no lookup, the HMAC is stale
        tx.delete(hmacPath);
        staleCount++;
      }
    }
    
    // Remove lookups and HMACs for the keys we just processed
    for (const lookupPath of lookupsToClear) {
      tx.delete(lookupPath);
      staleCount++;
    }
    
    for (const hmacPath of hmacsToClear) {
      tx.delete(hmacPath);
      staleCount++;
    }
    
    // Commit all changes in a single transaction
    await tx.commit();
    
    return {
      revokedCount,
      staleCount,
      rotationCount,
      timestamp: now
    };
  }
  
  /**
   * Get decrypted key value by key ID (for internal use only)
   * 
   * @param {string} keyId - The key ID
   * @returns {Promise<string|null>} The decrypted key or null if not found
   */
  async _getDecryptedKeyValue(keyId) {
    if (!isValidUuid(keyId)) {
      return null;
    }
    
    try {
      const apiKey = await this.storage.get(getKeyStorageId(keyId));
      
      if (!apiKey || !apiKey.encryptedKey) {
        return null;
      }
      
      // Decrypt the key value
      const decryptedKey = await decryptData(apiKey.encryptedKey, this.encryptionKey, this.isTestMode);
      return decryptedKey;
    } catch (error) {
      console.error(`Error decrypting key ${keyId}:`, error);
      return null;
    }
  }
}