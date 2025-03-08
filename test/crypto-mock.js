/**
 * Mock implementation of the Web Cryptography API for tests
 */
import { jest } from "@jest/globals";

// Create a mock implementation of the Web Crypto API
const cryptoMock = {
  // Random generation functions
  getRandomValues: function (array) {
    // Fill the array with deterministic "random" values
    for (let i = 0; i < array.length; i++) {
      array[i] = (i * 11) % 256; // Deterministic but appears random enough
    }
    return array;
  },

  randomUUID: function () {
    return "test-uuid-1234";
  },

  // The subtle crypto API
  subtle: {
    // Key derivation and import
    importKey: function (format, keyData, algorithm, extractable, keyUsages) {
      return Promise.resolve({
        type: "mock-key",
        algorithm: algorithm,
        extractable: extractable,
        usages: keyUsages,
        _keyData: format === "raw" ? keyData : null,
      });
    },

    deriveKey: function (
      algorithm,
      keyMaterial,
      derivedKeyAlgorithm,
      extractable,
      keyUsages,
    ) {
      return Promise.resolve({
        type: "mock-derived-key",
        algorithm: derivedKeyAlgorithm,
        extractable: extractable,
        usages: keyUsages,
        _salt: algorithm.salt,
        _iterations: algorithm.iterations,
        _hash: algorithm.hash,
      });
    },

    // Encryption and decryption
    encrypt: function (algorithm, key, data) {
      // Mock an encrypted array with a specific pattern
      const encrypted = new Uint8Array(data.length + 16); // Add some space for IV
      encrypted.set(new Uint8Array(data.length).fill(255), 0); // Fill with 255
      encrypted.set(new TextEncoder().encode("MOCK_ENCRYPTED"), 4); // Add marker
      return Promise.resolve(encrypted.buffer);
    },

    decrypt: function (algorithm, key, data) {
      // For simplicity, always return "decrypted" as the result
      return Promise.resolve(new TextEncoder().encode("decrypted").buffer);
    },

    // Signing and verification
    sign: function (algorithm, key, data) {
      // Generate mock signature
      const signature = new Uint8Array(32).fill(128); // Fixed signature for testing
      return Promise.resolve(signature.buffer);
    },

    verify: function (algorithm, key, signature, data) {
      // Always verify as true for testing
      return Promise.resolve(true);
    },
  },
};

// Save original crypto if it exists
const originalCrypto = global.crypto;

// Apply our mock to the global object
global.crypto = {
  ...originalCrypto,
  ...cryptoMock,
};

// Export the mock for direct use in tests if needed
export default cryptoMock;
