/**
 * Mock HTTP-related objects for testing
 */
import { createTestAdmin } from "../factories.js";
import { jest } from "@jest/globals";

/**
 * Create a mock request
 *
 * @param {Object} options - Request options
 * @returns {Object} Mock request object
 */
export function createMockRequest(options = {}) {
  const {
    method = "GET",
    url = "http://example.com/test",
    headers = {},
    body = null,
    admin = null,
    params = {},
  } = options;

  const headerMap = new Map(Object.entries(headers));

  // Add admin headers if provided
  if (admin) {
    headerMap.set("X-Admin-ID", admin.keyId);
    headerMap.set("X-Admin-Email", admin.email);
    headerMap.set("X-Admin-Role", admin.role);
  }

  const request = {
    method,
    url,
    headers: {
      get: (name) => headerMap.get(name),
      has: (name) => headerMap.has(name),
      set: (name, value) => headerMap.set(name, value),
      append: (name, value) => {
        const current = headerMap.get(name);

        if (current) {
          headerMap.set(name, `${current}, ${value}`);
        } else {
          headerMap.set(name, value);
        }
      },
      delete: (name) => headerMap.delete(name),
      entries: () => headerMap.entries(),
    },
    params,
  };

  // Add JSON method if body is provided
  if (body) {
    request.json = jest.fn().mockResolvedValue(body);
    request.text = jest.fn().mockResolvedValue(
      typeof body === "string" ? body : JSON.stringify(body)
    );
  }

  // Clone method
  request.clone = jest.fn().mockReturnValue({ ...request });

  return request;
}

/**
 * Create a mock response
 *
 * @returns {Object} Mock Response constructor
 */
export function createMockResponse() {
  return jest.fn().mockImplementation((body, options = {}) => {
    const { status = 200, statusText = "", headers = {} } = options;

    const response = {
      body,
      status,
      statusText,
      headers: new Map(Object.entries(headers)),
      json: jest.fn().mockImplementation(() => {
        if (typeof body === "string") {
          return Promise.resolve(JSON.parse(body));
        }

        return Promise.resolve(body);
      }),
      text: jest.fn().mockImplementation(() => {
        if (typeof body === "string") {
          return Promise.resolve(body);
        }

        return Promise.resolve(JSON.stringify(body));
      }),
      clone: jest.fn().mockReturnValue(response),
    };

    return response;
  });
}

/**
 * Create a mock context with admin info
 *
 * @param {Object} options - Context options
 * @returns {Object} Mock context
 */
export function createMockContext(options = {}) {
  const {
    admin = createTestAdmin(),
    params = {},
    env = {},
    waitUntil = jest.fn(),
  } = options;

  return {
    admin,
    params,
    env,
    waitUntil,
  };
}
