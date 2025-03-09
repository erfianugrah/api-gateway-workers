/**
 * Mock ApiKeyAdapter for testing
 */
export class ApiKeyAdapter {
  /**
   * Create a new ApiKeyAdapter
   */
  constructor() {}

  /**
   * Validate an API key
   * 
   * @param {string} apiKey - API key to validate
   * @param {string[]} requiredScopes - Required scopes
   * @returns {Promise<Object>} Validation result
   */
  async validateKey(apiKey, requiredScopes = []) {
    if (apiKey === "km_valid_admin_key") {
      return {
        valid: true,
        keyId: "admin123",
        name: "Test Admin",
        email: "admin@example.com",
        scopes: ["admin:keys:read", "admin:keys:create", "admin:keys:revoke"],
        role: "KEY_ADMIN",
      };
    } else if (apiKey === "km_super_admin_key") {
      return {
        valid: true,
        keyId: "super123",
        name: "Super Admin",
        email: "super@example.com",
        scopes: ["admin:*"],
        role: "SUPER_ADMIN",
      };
    } else {
      return {
        valid: false,
        error: "Invalid API key",
      };
    }
  }
}