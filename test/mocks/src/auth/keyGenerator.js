/**
 * Mock createApiKey function for testing
 * 
 * @param {Object} keyData - Key data
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} Created API key
 */
export const createApiKey = jest.fn(async (keyData, env) => {
  return {
    id: "test-key-id",
    key: "km_test_key_value",
    name: keyData.name || "Test Key",
    owner: keyData.owner || "Test Owner",
    email: keyData.email,
    scopes: keyData.scopes || [],
    role: keyData.role || "CUSTOM",
    createdAt: Date.now(),
    expiresAt: keyData.expiresAt || 0,
  };
});