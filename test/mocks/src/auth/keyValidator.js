/**
 * Mock functions for API key validation
 */

/**
 * Mock validateApiKey function for testing
 * 
 * @param {string} apiKey - API key to validate
 * @param {string[]} requiredScopes - Required scopes
 * @param {Object} env - Environment bindings
 * @returns {Promise<Object>} Validation result
 */
export async function validateApiKey(apiKey, requiredScopes = [], env) {
  // Basic validation logic for testing
  if (!apiKey) {
    return { valid: false, error: "No API key provided" };
  }
  
  if (apiKey === "km_valid_admin_key" || apiKey === "km_active_key") {
    return {
      valid: true,
      keyId: "test-key-id",
      name: "Test Admin",
      owner: "Test Owner",
      email: "admin@example.com",
      scopes: ["admin:keys:read", "admin:keys:create", "admin:keys:revoke", "read:data", "write:data"],
      role: "KEY_ADMIN",
    };
  } else if (apiKey === "km_super_admin_key") {
    return {
      valid: true,
      keyId: "super123",
      name: "Super Admin",
      owner: "Super Admin",
      email: "super@example.com",
      scopes: ["admin:*"],
      role: "SUPER_ADMIN",
    };
  } else if (apiKey === "km_wildcard_key") {
    return {
      valid: true,
      keyId: "wildcard-key-id",
      name: "Wildcard Key",
      owner: "Admin Owner",
      email: "admin@example.com",
      scopes: ["admin:keys:*", "read:*"],
      role: "CUSTOM"
    };
  } else if (apiKey === "km_revoked_key") {
    return { 
      valid: false, 
      error: "API key is not active" 
    };
  } else if (apiKey === "km_expired_key") {
    return { 
      valid: false, 
      error: "API key has expired" 
    };
  } else if (apiKey === "km_stale_key") {
    return { 
      valid: false, 
      error: "Key data not found" 
    };
  } else {
    return {
      valid: false,
      error: "Invalid API key",
    };
  }
}

/**
 * Check if a key has a required scope
 * 
 * @param {Object} validatedKey - Validated key object
 * @param {string} requiredScope - Required scope
 * @returns {boolean} True if key has the scope
 */
export function hasScope(validatedKey, requiredScope) {
  if (!validatedKey || !validatedKey.valid || !validatedKey.scopes) {
    return false;
  }
  
  const scopes = validatedKey.scopes;
  const normalizedRequiredScope = requiredScope.toLowerCase();
  
  // Direct match check
  if (scopes.some(scope => scope.toLowerCase() === normalizedRequiredScope)) {
    return true;
  }
  
  // Wildcard match check
  for (const scope of scopes) {
    const normalizedScope = scope.toLowerCase();
    
    // Full wildcard match (e.g., admin:*)
    if (normalizedScope === 'admin:*' && normalizedRequiredScope.startsWith('admin:')) {
      return true;
    }
    
    // Section wildcard match (e.g., admin:keys:*)
    if (normalizedScope.endsWith(':*')) {
      const baseScope = normalizedScope.slice(0, -1);
      if (normalizedRequiredScope.startsWith(baseScope)) {
        return true;
      }
    }
  }
  
  return false;
}