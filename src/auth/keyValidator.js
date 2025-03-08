/**
 * Key Validator Module
 * Handles validation of API keys
 */

/**
 * Validate an API key
 *
 * @param {string} apiKey - The API key to validate
 * @param {string[]} requiredScopes - Optional array of required scopes
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<Object>} Validation result
 */
export async function validateApiKey(apiKey, requiredScopes = [], env) {
  // Skip validation if no key provided
  if (!apiKey) {
    return { valid: false, error: "No API key provided" };
  }

  // Look up the key
  const keyId = await env.KV.get(`lookup:${apiKey}`);
  if (!keyId) {
    return { valid: false, error: "Invalid API key" };
  }

  // Get key data
  const keyDataJson = await env.KV.get(`key:${keyId}`);
  if (!keyDataJson) {
    // Clean up the stale lookup entry
    await env.KV.delete(`lookup:${apiKey}`);
    return { valid: false, error: "Key data not found" };
  }

  const keyData = JSON.parse(keyDataJson);

  // Check if key is active and not expired
  if (keyData.status !== "active") {
    return { valid: false, error: "API key is not active" };
  }

  if (keyData.expiresAt > 0 && keyData.expiresAt < Date.now()) {
    // Auto-revoke expired keys
    keyData.status = "revoked";
    keyData.revokedAt = Date.now();
    keyData.revokedReason = "expired";
    await env.KV.put(`key:${keyId}`, JSON.stringify(keyData));
    return { valid: false, error: "API key has expired" };
  }

  // Check required scopes (if any)
  if (requiredScopes.length > 0) {
    // Handle wildcard scopes properly
    const hasRequiredScopes = requiredScopes.every((requiredScope) => {
      // Check for direct match
      if (keyData.scopes.includes(requiredScope)) {
        return true;
      }

      // Check for wildcard matches
      // For example, if requiredScope is "admin:keys:read" and key has "admin:keys:*"
      const requiredParts = requiredScope.split(":");
      return keyData.scopes.some((scope) => {
        const scopeParts = scope.split(":");
        if (scopeParts.length !== requiredParts.length) return false;

        // Check each part - allow wildcards
        for (let i = 0; i < scopeParts.length; i++) {
          if (scopeParts[i] !== "*" && scopeParts[i] !== requiredParts[i]) {
            return false;
          }
        }

        return true;
      });
    });

    if (!hasRequiredScopes) {
      return {
        valid: false,
        error: "API key does not have required scopes",
        requiredScopes,
        providedScopes: keyData.scopes,
      };
    }
  }

  // Update last used timestamp (asynchronously)
  keyData.lastUsedAt = Date.now();
  env.KV.put(`key:${keyId}`, JSON.stringify(keyData))
    .catch((err) => console.error("Failed to update lastUsedAt", err));

  // Return successful validation
  return {
    valid: true,
    keyId: keyId,
    owner: keyData.owner,
    email: keyData.email,
    scopes: keyData.scopes,
    role: keyData.role,
    name: keyData.name,
  };
}

/**
 * Validate if a key has the required permission scope
 *
 * @param {Object} validatedKey - Key object returned from validateApiKey
 * @param {string} requiredScope - The required permission scope
 * @returns {boolean} True if the key has the required permission
 */
export function hasScope(validatedKey, requiredScope) {
  if (!validatedKey || !validatedKey.valid || !validatedKey.scopes) {
    return false;
  }

  const scopes = validatedKey.scopes;

  // Direct match check
  if (scopes.includes(requiredScope)) {
    return true;
  }

  // Wildcard match check
  const requiredParts = requiredScope.split(":");

  return scopes.some((scope) => {
    const scopeParts = scope.split(":");

    // First fast check - if lengths don't match and it's not a wildcard
    if (scopeParts.length < requiredParts.length && !scopeParts.includes("*")) {
      return false;
    }

    // Check for wildcard in the scope (e.g., admin:keys:*)
    for (let i = 0; i < scopeParts.length; i++) {
      // If we've gone past the required scope parts, scope is more specific
      if (i >= requiredParts.length) {
        return false;
      }

      // If part is wildcard, it matches anything at this level
      if (scopeParts[i] === "*") {
        return true;
      }

      // If parts don't match, no match
      if (scopeParts[i] !== requiredParts[i]) {
        return false;
      }
    }

    // If we get here, all parts matched
    return true;
  });
}
