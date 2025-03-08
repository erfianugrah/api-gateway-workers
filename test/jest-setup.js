// We need the Node.js URL object for our mocks
import { URL as NodeURL } from "url";
global.NodeURL = NodeURL;

// Define expect and other Jest globals
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
global.expect = expect;
global.afterAll = afterAll;
global.afterEach = afterEach;
global.beforeAll = beforeAll;
global.beforeEach = beforeEach;
global.describe = describe;
global.it = it;
global.jest = jest;

// Set test environment
process.env.NODE_ENV = "test";

// Mock the Web Crypto API
global.crypto = {
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

// Define DurableObject for the test environment
global.DurableObject = class DurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
};

// Mock TextEncoder and TextDecoder if needed
if (typeof TextEncoder === "undefined") {
  global.TextEncoder = class TextEncoder {
    encode(text) {
      const buf = Buffer.from(text);
      return new Uint8Array(buf);
    }
  };
}

if (typeof TextDecoder === "undefined") {
  global.TextDecoder = class TextDecoder {
    decode(buffer) {
      return Buffer.from(buffer).toString();
    }
  };
}

// Add mock Response if needed
if (typeof Response === "undefined") {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = new Map(Object.entries(init.headers || {}));
    }
  };
}

// Add mock Request if needed
if (typeof Request === "undefined") {
  global.Request = class Request {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || "GET";
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = init.body || null;
    }
  };
}

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    status: 200,
    headers: new Map(),
  })
);

// Do not mock module imports in setup file - it's better to do this in individual test files
