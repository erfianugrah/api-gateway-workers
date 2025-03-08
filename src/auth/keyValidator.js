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

  try {
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
      // Check each required scope against the key's scopes
      const missingScopes = [];

      for (const requiredScope of requiredScopes) {
        // Check if the key has this scope directly or via a wildcard
        if (!hasScope({ valid: true, scopes: keyData.scopes }, requiredScope)) {
          missingScopes.push(requiredScope);
        }
      }

      if (missingScopes.length > 0) {
        return {
          valid: false,
          error: "API key does not have required scopes",
          requiredScopes: missingScopes,
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
  } catch (error) {
    console.error("Key validation error:", error);
    return {
      valid: false,
      error: `Validation error: ${error.message}`,
    };
  }
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
  const normalizedRequiredScope = requiredScope.toLowerCase();

  // Direct match check
  if (scopes.some((scope) => scope.toLowerCase() === normalizedRequiredScope)) {
    return true;
  }

  // Wildcard match check
  for (const scope of scopes) {
    const normalizedScope = scope.toLowerCase();

    // Full wildcard match (e.g., admin:*)
    if (
      normalizedScope === "admin:*" &&
      normalizedRequiredScope.startsWith("admin:")
    ) {
      return true;
    }

    // Section wildcard match (e.g., admin:keys:*)
    if (normalizedScope.endsWith(":*")) {
      const baseScope = normalizedScope.slice(0, -1);
      if (normalizedRequiredScope.startsWith(baseScope)) {
        return true;
      }
    }

    // Check for more specific wildcards in the middle (e.g., read:*:data)
    const parts = normalizedScope.split(":");
    const requiredParts = normalizedRequiredScope.split(":");

    if (parts.length === requiredParts.length) {
      let match = true;
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== "*" && parts[i] !== requiredParts[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        return true;
      }
    }
  }

  return false;
}
