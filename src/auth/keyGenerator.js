/**
 * Key Generator Module
 * Handles creation of API keys
 */

/**
 * Generate a new secure API key
 *
 * @returns {Promise<string>} The generated API key
 */
export async function generateSecureApiKey() {
  // Create a buffer with 32 random bytes (256 bits of entropy)
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);

  // Convert to hex string
  const keyValue = Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Add prefix for identification
  return `km_${keyValue}`;
}

/**
 * Create a new API key
 *
 * @param {Object} keyData - Data for the new key
 * @param {string} keyData.name - Name of the key
 * @param {string} keyData.owner - Owner of the key
 * @param {string} keyData.email - Email associated with the key
 * @param {string[]} keyData.scopes - Permission scopes for the key
 * @param {string} keyData.role - Role name for admin keys
 * @param {number} [keyData.expiresAt] - Optional expiration timestamp
 * @param {string} [keyData.createdBy] - ID of admin who created this key
 * @param {Object} [keyData.metadata] - Additional metadata for the key
 * @param {Object} env - Environment variables and bindings
 * @returns {Promise<Object>} The created key
 */
export async function createApiKey(keyData, env) {
  // Validate required fields
  if (!keyData.name || !keyData.owner || !keyData.scopes) {
    throw new Error("Name, owner, and scopes are required");
  }

  // Generate API key
  const apiKey = await generateSecureApiKey();

  // Generate UUID for the key
  const keyId = crypto.randomUUID();

  // Create key object
  const newKey = {
    id: keyId,
    key: apiKey, // Will be removed before storage
    name: keyData.name,
    owner: keyData.owner,
    email: keyData.email || null,
    scopes: keyData.scopes,
    role: keyData.role || null,
    status: "active",
    createdAt: Date.now(),
    expiresAt: keyData.expiresAt || 0, // 0 means no expiration
    lastUsedAt: 0,
    createdBy: keyData.createdBy || null,
    metadata: keyData.metadata || {},
  };

  // Store key data (without the actual key value)
  const storedKey = { ...newKey };
  delete storedKey.key; // Never store the actual key in the data

  // Store key data and lookup in a transaction
  try {
    // Use transaction if available
    if (typeof env.KV.transaction === "function") {
      const tx = env.KV.transaction();
      tx.put(`key:${keyId}`, JSON.stringify(storedKey));
      tx.put(`lookup:${apiKey}`, keyId);

      // Store indices for efficient lookups
      if (keyData.owner) {
        tx.put(`index:owner:${keyData.owner}:${keyId}`, keyId);
      }

      // If this is an admin key, store in admin index
      if (keyData.scopes.some((scope) => scope.startsWith("admin:"))) {
        tx.put(`index:admin:${keyId}`, keyId);
      }

      await tx.commit();
    } else {
      // Fallback if transactions aren't available
      await env.KV.put(`key:${keyId}`, JSON.stringify(storedKey));
      await env.KV.put(`lookup:${apiKey}`, keyId);

      // Store indices
      if (keyData.owner) {
        await env.KV.put(`index:owner:${keyData.owner}:${keyId}`, keyId);
      }

      // Admin index
      if (keyData.scopes.some((scope) => scope.startsWith("admin:"))) {
        await env.KV.put(`index:admin:${keyId}`, keyId);
      }
    }

    // Return the complete key, including the API key value
    return newKey;
  } catch (error) {
    console.error("Failed to create API key:", error);
    throw new Error(`Failed to create API key: ${error.message}`);
  }
}
