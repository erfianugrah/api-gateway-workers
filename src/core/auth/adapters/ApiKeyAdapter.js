/**
 * Adapter to use existing auth functions with new interfaces
 */
export class ApiKeyAdapter {
  /**
   * Create a new ApiKeyAdapter
   *
   * @param {Object} storage - KV storage
   */
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Validate an API key
   *
   * @param {string} apiKey - API key to validate
   * @param {string[]} requiredScopes - Required scopes
   * @returns {Promise<Object>} Validation result
   */
  async validateKey(apiKey, requiredScopes = []) {
    if (!apiKey) {
      return {
        valid: false,
        error: "API key is required",
      };
    }

    if (!apiKey.startsWith("km_")) {
      return {
        valid: false,
        error: "Invalid API key format",
      };
    }

    try {
      // Use the lookup index for faster validation
      const keyId = await this.storage.get(`lookup:${apiKey}`);

      if (!keyId) {
        return {
          valid: false,
          error: "Invalid API key",
        };
      }

      // Get the full key details
      const keyData = await this.storage.get(`key:${keyId}`);

      if (!keyData) {
        // Clean up the stale lookup entry
        await this.storage.delete(`lookup:${apiKey}`);
        return {
          valid: false,
          error: "Key data not found",
        };
      }

      // Parse the key data
      const foundKey = JSON.parse(keyData);

      // Check key status
      if (foundKey.status !== "active") {
        return {
          valid: false,
          error: `API key is ${foundKey.status}`,
        };
      }

      // Check if the key has expired
      if (foundKey.expiresAt > 0 && foundKey.expiresAt < Date.now()) {
        // Auto-revoke expired keys
        foundKey.status = "revoked";
        foundKey.revokedAt = Date.now();
        foundKey.revokedReason = "expired";
        await this.storage.put(`key:${keyId}`, JSON.stringify(foundKey));

        return {
          valid: false,
          error: "API key has expired",
        };
      }

      // Check if the key has the required scopes
      if (requiredScopes.length > 0) {
        // Convert all scopes to lowercase for case-insensitive matching
        const normalizedKeyScopes = foundKey.scopes.map((s) => s.toLowerCase());
        const normalizedRequiredScopes = requiredScopes.map((s) =>
          s.toLowerCase()
        );

        const hasRequiredScopes = normalizedRequiredScopes.every(
          (scope) => normalizedKeyScopes.includes(scope),
        );

        if (!hasRequiredScopes) {
          return {
            valid: false,
            error: "API key does not have the required scopes",
            requiredScopes,
            providedScopes: foundKey.scopes,
          };
        }
      }

      // Update last used timestamp (don't await to make validation faster)
      foundKey.lastUsedAt = Date.now();
      this.storage.put(`key:${keyId}`, JSON.stringify(foundKey))
        .catch((error) =>
          console.error("Failed to update lastUsedAt timestamp:", error)
        );

      // Return valid result
      return {
        valid: true,
        keyId: keyId,
        owner: foundKey.owner,
        email: foundKey.email,
        name: foundKey.name,
        scopes: foundKey.scopes,
        role: foundKey.role,
      };
    } catch (error) {
      console.error("API key validation error:", error);

      return {
        valid: false,
        error: `Validation error: ${error.message}`,
      };
    }
  }
}
