import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  checkRateLimit,
  decryptData,
  encryptData,
  generateApiKey,
  generateHmac,
  getClientIp,
  rotateEncryptionMaterial,
  rotateHmacMaterial,
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

    it("should decrypt data using AES-GCM", async () => {
      // Mock the encrypted data
      const encrypted = {
        encryptedData: "010203",
        iv: "040506",
        salt: "070809",
        iterations: 100000,
        version: 2,
      };

      const decrypted = await decryptData(encrypted, testSecret, false);

      // Verify the decrypted data
      expect(decrypted).toBe("decrypted-data");

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
        ["decrypt"],
      );

      expect(crypto.subtle.decrypt).toHaveBeenCalledWith(
        {
          name: "AES-GCM",
          iv: expect.any(Uint8Array),
          tagLength: 128,
        },
        "mock-derived-key",
        expect.any(Uint8Array),
      );
    });

    it("should handle legacy (v1) encryption format", async () => {
      // Mock an encrypted object in the v1 format
      const encryptedV1 = {
        encryptedData: "010203",
        iv: "040506",
        version: 1,
      };

      const decrypted = await decryptData(encryptedV1, testSecret, false);

      // Verify the decrypted data
      expect(decrypted).toBe("decrypted-data");

      // For v1, it should use a fixed salt
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
        ["decrypt"],
      );
    });

    it("should throw error for unsupported version", async () => {
      const encryptedUnknown = {
        encryptedData: "010203",
        iv: "040506",
        version: 999,
      };

      await expect(decryptData(encryptedUnknown, testSecret, false))
        .rejects.toThrow("Unsupported encryption version");
    });

    it("should throw error if required parameters are missing", async () => {
      await expect(encryptData("", testSecret)).rejects.toThrow();
      await expect(encryptData(testData, "")).rejects.toThrow();

      await expect(decryptData(null, testSecret)).rejects.toThrow();
      await expect(decryptData({}, "")).rejects.toThrow();
    });
  });

  describe("generateHmac and verifyHmac", () => {
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

    it("should verify a valid HMAC", async () => {
      // Mock the generateHmac to return a specific value
      jest.spyOn(global, "generateHmac").mockResolvedValue("valid-hmac");

      const isValid = await verifyHmac(keyId, "valid-hmac", testSecret, false);
      expect(isValid).toBe(true);
    });

    it("should reject an invalid HMAC", async () => {
      // Mock the generateHmac to return a different value
      jest.spyOn(global, "generateHmac").mockResolvedValue("real-hmac");

      const isValid = await verifyHmac(keyId, "fake-hmac", testSecret, false);
      expect(isValid).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      // Make crypto.subtle.sign throw an error
      crypto.subtle.sign = jest.fn().mockRejectedValue(new Error("HMAC error"));

      // Should not throw, just return false
      const isValid = await verifyHmac(keyId, "any-hmac", testSecret, false);
      expect(isValid).toBe(false);
    });
  });

  describe("rotateEncryptionMaterial", () => {
    let mockStorage;

    beforeEach(() => {
      // Create a mock storage
      mockStorage = {
        data: new Map([
          ["key:key1", {
            id: "key1",
            encryptedKey: {
              encryptedData: "encrypted1",
              iv: "iv1",
              version: 1,
            },
          }],
          ["key:key2", {
            id: "key2",
            encryptedKey: {
              encryptedData: "encrypted2",
              iv: "iv2",
              version: 1,
            },
          }],
          ["key:no-key", { id: "no-key" }], // No encryptedKey field
        ]),
        put: jest.fn(async (key, value) => mockStorage.data.set(key, value)),
        list: jest.fn(async ({ prefix }) => {
          const entries = new Map();
          for (const [key, value] of mockStorage.data.entries()) {
            if (key.startsWith(prefix)) {
              entries.set(key, value);
            }
          }
          return entries;
        }),
      };

      // Mock decryptData and encryptData
      jest.spyOn(global, "decryptData").mockImplementation(
        async (encrypted, secret) => {
          if (encrypted.encryptedData === "encrypted1") return "decrypted-key1";
          if (encrypted.encryptedData === "encrypted2") return "decrypted-key2";
          return "unknown";
        },
      );

      jest.spyOn(global, "encryptData").mockImplementation(
        async (data, secret) => {
          return {
            encryptedData: `new-encrypted-${data}`,
            iv: "new-iv",
            salt: "new-salt",
            iterations: 100000,
            version: 2,
          };
        },
      );
    });

    it("should rotate encryption keys", async () => {
      const rotatedCount = await rotateEncryptionMaterial(
        mockStorage,
        "old-secret",
        "new-secret",
      );

      // Should have rotated 2 keys
      expect(rotatedCount).toBe(2);

      // Check that storage.put was called for both keys
      expect(mockStorage.put).toHaveBeenCalledTimes(2);

      // Check the updated values
      const key1 = mockStorage.data.get("key:key1");
      expect(key1.encryptedKey.encryptedData).toBe(
        "new-encrypted-decrypted-key1",
      );
      expect(key1.encryptedKey.version).toBe(2);

      const key2 = mockStorage.data.get("key:key2");
      expect(key2.encryptedKey.encryptedData).toBe(
        "new-encrypted-decrypted-key2",
      );
      expect(key2.encryptedKey.version).toBe(2);
    });

    it("should handle errors during rotation", async () => {
      // Make decryptData fail for the second key
      jest.spyOn(global, "decryptData")
        .mockImplementationOnce(async () => "decrypted-key1")
        .mockImplementationOnce(async () => {
          throw new Error("Decryption failed");
        });

      const rotatedCount = await rotateEncryptionMaterial(
        mockStorage,
        "old-secret",
        "new-secret",
      );

      // Should have rotated 1 key successfully
      expect(rotatedCount).toBe(1);

      // Only the first key should be updated
      const key1 = mockStorage.data.get("key:key1");
      expect(key1.encryptedKey.encryptedData).toBe(
        "new-encrypted-decrypted-key1",
      );

      // The second key should remain unchanged
      const key2 = mockStorage.data.get("key:key2");
      expect(key2.encryptedKey.encryptedData).toBe("encrypted2");
    });
  });

  describe("rotateHmacMaterial", () => {
    let mockStorage;

    beforeEach(() => {
      // Create a mock storage
      mockStorage = {
        data: new Map([
          ["hmac:km_key1", "old-hmac1"],
          ["hmac:km_key2", "old-hmac2"],
          ["lookup:km_key1", "key1-id"],
          ["lookup:km_key2", "key2-id"],
          // A lookup without a corresponding key
          ["lookup:km_key3", "key3-id"],
          // A hmac without a corresponding lookup
          ["hmac:km_orphan", "old-hmac-orphan"],
        ]),
        put: jest.fn(async (key, value) => mockStorage.data.set(key, value)),
        get: jest.fn(async (key) => mockStorage.data.get(key)),
        list: jest.fn(async ({ prefix }) => {
          const entries = new Map();
          for (const [key, value] of mockStorage.data.entries()) {
            if (key.startsWith(prefix)) {
              entries.set(key, value);
            }
          }
          return entries;
        }),
      };

      // Mock generateHmac
      jest.spyOn(global, "generateHmac").mockImplementation(
        async (keyId, secret) => {
          return `new-hmac-${keyId}`;
        },
      );
    });

    it("should rotate HMAC signatures", async () => {
      const rotatedCount = await rotateHmacMaterial(
        mockStorage,
        "old-secret",
        "new-secret",
      );

      // Should have rotated 2 HMACs (the ones with valid lookups)
      expect(rotatedCount).toBe(2);

      // Check that storage.put was called for both valid HMACs
      expect(mockStorage.put).toHaveBeenCalledTimes(2);

      // Check the updated values
      expect(mockStorage.data.get("hmac:km_key1")).toBe("new-hmac-key1-id");
      expect(mockStorage.data.get("hmac:km_key2")).toBe("new-hmac-key2-id");

      // The orphaned HMAC should not be updated
      expect(mockStorage.data.get("hmac:km_orphan")).toBe("old-hmac-orphan");
    });

    it("should handle errors during rotation", async () => {
      // Make generateHmac fail for the second key
      jest.spyOn(global, "generateHmac")
        .mockImplementationOnce(async () => "new-hmac-key1-id")
        .mockImplementationOnce(async () => {
          throw new Error("HMAC generation failed");
        });

      const rotatedCount = await rotateHmacMaterial(
        mockStorage,
        "old-secret",
        "new-secret",
      );

      // Should have rotated 1 HMAC successfully
      expect(rotatedCount).toBe(1);

      // Only the first HMAC should be updated
      expect(mockStorage.data.get("hmac:km_key1")).toBe("new-hmac-key1-id");

      // The second HMAC should remain unchanged
      expect(mockStorage.data.get("hmac:km_key2")).toBe("old-hmac2");
    });
  });

  describe("checkRateLimit", () => {
    let mockStorage;

    beforeEach(() => {
      // Create a mock storage
      mockStorage = {
        data: new Map(),
        get: jest.fn(async (key) => mockStorage.data.get(key)),
        put: jest.fn(async (key, value) => mockStorage.data.set(key, value)),
      };
    });

    it("should create a new rate limit record for first request", async () => {
      const result = await checkRateLimit(
        mockStorage,
        "client:key",
        100,
        60000,
      );

      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(99);
      expect(result.reset).toBe(1060000); // 1000000 + 60000
      expect(mockStorage.put).toHaveBeenCalled();

      // Verify the stored data
      const storedData = mockStorage.data.get("client:key");
      expect(storedData.count).toBe(1);
      expect(storedData.resetAt).toBe(1060000);
    });

    it("should increment counter for subsequent requests", async () => {
      // First request
      await checkRateLimit(mockStorage, "client:key", 100, 60000);

      // Second request
      const result = await checkRateLimit(
        mockStorage,
        "client:key",
        100,
        60000,
      );

      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(98);

      // Verify the counter was incremented
      const storedData = mockStorage.data.get("client:key");
      expect(storedData.count).toBe(2);
    });

    it("should limit requests when limit is reached", async () => {
      // Set up an existing rate limit at the threshold
      mockStorage.data.set("client:key", {
        count: 100,
        resetAt: 1060000,
      });

      const result = await checkRateLimit(
        mockStorage,
        "client:key",
        100,
        60000,
      );

      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(60);

      // Counter should not be incremented
      expect(mockStorage.put).not.toHaveBeenCalled();
    });

    it("should reset counter when time window has passed", async () => {
      // Set up an expired rate limit
      mockStorage.data.set("client:key", {
        count: 100,
        resetAt: 999000, // Already expired
      });

      const result = await checkRateLimit(
        mockStorage,
        "client:key",
        100,
        60000,
      );

      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(99);

      // Counter should be reset
      const storedData = mockStorage.data.get("client:key");
      expect(storedData.count).toBe(1);
      expect(storedData.resetAt).toBe(1060000);
    });
  });

  describe("getClientIp", () => {
    it("should extract IP from CF-Connecting-IP header", () => {
      const request = {
        headers: new Map([
          ["CF-Connecting-IP", "192.168.1.1"],
        ]),
        headers: {
          get: function (header) {
            if (header === "CF-Connecting-IP") return "192.168.1.1";
            return null;
          },
        },
      };

      expect(getClientIp(request)).toBe("192.168.1.1");
    });

    it("should fall back to X-Forwarded-For header", () => {
      const request = {
        headers: {
          get: function (header) {
            if (header === "X-Forwarded-For") return "10.0.0.1, 192.168.1.1";
            return null;
          },
        },
      };

      expect(getClientIp(request)).toBe("10.0.0.1");
    });

    it("should sanitize IP addresses", () => {
      const request = {
        headers: {
          get: function (header) {
            if (header === "CF-Connecting-IP") return "192.168.1.1\n";
            return null;
          },
        },
      };

      expect(getClientIp(request)).toBe("192.168.1.1");
    });

    it('should return "unknown" for invalid or missing IPs', () => {
      const request = {
        headers: {
          get: function () {
            return null;
          },
        },
      };

      expect(getClientIp(request)).toBe("unknown");

      const invalidRequest = {
        headers: {
          get: function (header) {
            if (header === "CF-Connecting-IP") {
              return "<script>alert(1)</script>";
            }
            return null;
          },
        },
      };

      expect(getClientIp(invalidRequest)).toBe("unknown");
    });
  });
});
