/**
 * Create a test API key
 *
 * @param {Object} overrides - Property overrides
 * @returns {Object} Test API key
 */
export function createTestKey(overrides = {}) {
  return {
    id: "test-key-id",
    key: "km_test-key-0123456789",
    name: "Test Key",
    owner: "test@example.com",
    scopes: ["read:data"],
    status: "active",
    createdAt: 1000000,
    expiresAt: 0,
    lastUsedAt: 0,
    ...overrides,
  };
}

/**
 * Create a test admin
 *
 * @param {Object} overrides - Property overrides
 * @returns {Object} Test admin
 */
export function createTestAdmin(overrides = {}) {
  return {
    keyId: "test-admin-id",
    email: "admin@example.com",
    role: "KEY_ADMIN",
    scopes: ["admin:keys:create", "admin:keys:read", "admin:keys:revoke"],
    ...overrides,
  };
}

/**
 * Create a test request
 *
 * @param {Object} options - Request options
 * @returns {Object} Test request
 */
export function createTestRequest(options = {}) {
  const {
    method = "GET",
    url = "http://example.com/test",
    headers = {},
    body = null,
    admin = null,
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
    },
  };

  // Add JSON method if body is provided
  if (body) {
    request.json = jest.fn().mockResolvedValue(body);
  }

  return request;
}

/**
 * Create test context
 *
 * @param {Object} options - Context options
 * @returns {Object} Test context
 */
export function createTestContext(options = {}) {
  const {
    params = {},
    env = {},
    storage = null,
  } = options;

  return {
    params,
    env,
    storage: storage || {
      get: jest.fn().mockResolvedValue(null),
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue(new Map()),
    },
  };
}
