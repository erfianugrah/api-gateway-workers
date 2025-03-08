/**
 * Test file for security utilities
 * NOTE: Using a different approach for mocking to avoid read-only property issues
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

// Import all functions individually
import {
  checkRateLimit,
  decryptData,
  encryptData,
  generateApiKey,
  generateHmac,
  getClientIp,
  verifyHmac,
} from "../../src/utils/security.js";

describe("Security utilities", () => {
  // Save original crypto
  const originalCrypto = global.crypto;

  beforeEach(() => {
    // Mock crypto functions for deterministic testing
    global.crypto = {
      getRandomValues: jest.fn((buffer) => {
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = i % 256; // Deterministic pattern
        }
        return buffer;
      }),
      randomUUID: jest.fn(() => "test-uuid"),
      subtle: {
        importKey: jest.fn().mockResolvedValue("mock-key"),
        deriveKey: jest.fn().mockResolvedValue("mock-derived-key"),
        encrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        decrypt: jest.fn().mockResolvedValue(
          new TextEncoder().encode("decrypted-data"),
        ),
        sign: jest.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
      },
    };

    // Mock Date.now
    jest.spyOn(Date, "now").mockImplementation(() => 1000000);
  });

  afterEach(() => {
    // Restore original values
    global.crypto = originalCrypto;
    jest.restoreAllMocks();
  });

  describe("generateApiKey", () => {
    it("should generate a key with default prefix", () => {
      const key = generateApiKey();

      // The key should start with the default prefix
      expect(key.startsWith("km_")).toBe(true);

      // The key should be long enough
      expect(key.length).toBeGreaterThan(10);

      // The full result should be predictable based on our mock
      const expectedSuffix =
        "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
      expect(key).toBe(`km_${expectedSuffix}`);
    });

    it("should use a custom prefix if provided", () => {
      const key = generateApiKey("custom_");
      expect(key.startsWith("custom_")).toBe(true);
    });
  });

  describe("encryptData and decryptData", () => {
    const testSecret = "test-encryption-key";
    const testData = "secret-api-key";

    it("should encrypt data in test mode", async () => {
      const encrypted = await encryptData(testData, testSecret, true);

      expect(encrypted.encryptedData).toBe("test-encrypted-secret-api-key");
      expect(encrypted.version).toBe(1);
    });

    it("should decrypt data in test mode", async () => {
      const encrypted = await encryptData(testData, testSecret, true);
      const decrypted = await decryptData(encrypted, testSecret, true);

      expect(decrypted).toBe(testData);
    });

    it("should encrypt data using AES-GCM", async () => {
      const encrypted = await encryptData(testData, testSecret, false);

      // Check the encrypted object structure
      expect(encrypted.encryptedData).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.iterations).toBe(100000);
      expect(encrypted.version).toBe(2);

      // Verify crypto.subtle was called with the right parameters
      expect(crypto.subtle.importKey).toHaveBeenCalledWith(
        "raw",
        expect.any(Uint8Array),
        { name: "PBKDF2" },
        false,
        ["deriveKey"],
      );

      expect(crypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          name: "PBKDF2",
          salt: expect.any(Uint8Array),
          iterations: 100000,
          hash: "SHA-256",
        },
        "mock-key",
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"],
      );

      expect(crypto.subtle.encrypt).toHaveBeenCalledWith(
        {
          name: "AES-GCM",
          iv: expect.any(Uint8Array),
          tagLength: 128,
        },
        "mock-derived-key",
        expect.any(Uint8Array),
      );
    });
  });

  describe("HMAC operations", () => {
    const testSecret = "test-hmac-secret";
    const keyId = "test-key-id";

    it("should generate a deterministic HMAC in test mode", async () => {
      const hmac = await generateHmac(keyId, testSecret, true);
      expect(hmac).toBe("test-hmac-test-key-id");
    });

    it("should verify an HMAC in test mode", async () => {
      const hmac = await generateHmac(keyId, testSecret, true);
      const isValid = await verifyHmac(keyId, hmac, testSecret, true);

      expect(isValid).toBe(true);
    });

    it("should generate an HMAC using SHA-384", async () => {
      const hmac = await generateHmac(keyId, testSecret, false);

      expect(hmac).toBeDefined();

      // Verify crypto.subtle was called correctly
      expect(crypto.subtle.importKey).toHaveBeenCalledWith(
        "raw",
        expect.any(Uint8Array),
        { name: "HMAC", hash: "SHA-384" },
        false,
        ["sign"],
      );

      expect(crypto.subtle.sign).toHaveBeenCalledWith(
        "HMAC",
        "mock-key",
        expect.any(Uint8Array),
      );
    });
  });

  describe("Rate Limiting", () => {
    let mockStorage;

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 0, 1, 0, 0, 0));

      // Create a mock storage
      mockStorage = {
        data: new Map(),
        get: jest.fn(async (key) => mockStorage.data.get(key)),
        put: jest.fn(async (key, value) => mockStorage.data.set(key, value)),
      };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should properly track request count within a time window", async () => {
      const key = "rate:127.0.0.1:/test";
      const limit = 5;
      const windowMs = 60000; // 1 minute

      // First request (1/5)
      let result = await checkRateLimit(mockStorage, key, limit, windowMs);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(5);

      // Second request (2/5)
      result = await checkRateLimit(mockStorage, key, limit, windowMs);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(4);
    });
  });

  describe("Client IP Extraction", () => {
    it("should prioritize Cloudflare headers for IP extraction", () => {
      // Create a request with both headers
      const request = {
        headers: {
          get: function (header) {
            if (header === "CF-Connecting-IP") return "2001:db8::1";
            if (header === "X-Forwarded-For") return "192.168.1.1, 10.0.0.1";
            return null;
          },
        },
      };

      // Should use the Cloudflare header
      expect(getClientIp(request)).toBe("2001:db8::1");
    });
  });
});
