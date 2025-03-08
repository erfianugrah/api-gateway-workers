/**
 * Mock Cloudflare Workers-specific objects for testing
 */
import { createMockDurableObjectState } from './storage.js';

/**
 * Create a mock Cloudflare Workers environment
 *
 * @param {Object} options - Environment options
 * @returns {Object} Mock Cloudflare environment object
 */
export function createMockEnv(options = {}) {
  const {
    kvValues = {},
    secretValues = {},
  } = options;

  return {
    // Durable Object binding
    KEY_MANAGER: {
      idFromName: jest.fn().mockReturnValue({
        toString: () => "test-durable-object-id",
      }),
      idFromString: jest.fn().mockReturnValue({
        toString: () => "test-durable-object-id",
      }),
      get: jest.fn().mockReturnValue({
        fetch: jest.fn().mockImplementation(async (request) => {
          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }),
      }),
    },
    
    // KV binding
    KV: {
      get: jest.fn().mockImplementation(async (key) => {
        return kvValues[key] || null;
      }),
      put: jest.fn().mockImplementation(async (key, value) => {
        kvValues[key] = value;
        return undefined;
      }),
      delete: jest.fn().mockImplementation(async (key) => {
        delete kvValues[key];
        return undefined;
      }),
      list: jest.fn().mockResolvedValue({ keys: [], list_complete: true }),
    },
    
    // Secret bindings
    SECRET_KEY: secretValues.SECRET_KEY || "test-secret-key",
    HMAC_SECRET: secretValues.HMAC_SECRET || "test-hmac-secret",
    JWT_SECRET: secretValues.JWT_SECRET || "test-jwt-secret",
    
    // Other settings
    VERSION: "1.0.0-test",
    ENVIRONMENT: "test",
  };
}

/**
 * Create a mock Durable Object
 *
 * @param {Function} handler - Function that implements the DO's behavior
 * @returns {Object} Mock Durable Object
 */
export function createMockDurableObject(handler) {
  const state = createMockDurableObjectState();
  const env = createMockEnv();
  
  return {
    state,
    env,
    fetch: jest.fn().mockImplementation((request) => {
      return handler ? handler(request, env, state) : new Response("OK");
    }),
    alarm: jest.fn(),
  };
}