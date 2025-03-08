# Testing Guide for API Key Manager

This guide provides instructions for testing the API Key Manager with the new authentication module.

## Setting Up the Test Environment

Before running tests, you need to set up a proper test environment:

### 1. Create a Testing KV Namespace

```bash
wrangler kv:namespace create "KEYS_TEST" --env test
```

Add the resulting namespace ID to your `wrangler.toml`:

```toml
[env.test]
kv_namespaces = [
  { binding = "KV", id = "YOUR_TEST_KV_NAMESPACE_ID" }
]
```

### 2. Configure Environment Variables

Create a `.env.test` file in your project root:

```
JWT_SECRET=test-jwt-secret-for-testing-only
```

### 3. Install Testing Dependencies

```bash
npm install --save-dev jest @cloudflare/workers-types
```

## Running the Tests

Run tests using npm:

```bash
npm test
```

For test coverage:

```bash
npm run test:coverage
```

## Test Structure

The tests are organized following the clean architecture patterns of the application:

### 1. Core Tests

- `core/keys/commands/*.test.js` - Test command objects
- `core/keys/handlers/*.test.js` - Test command handlers
- `core/auth/*.test.js` - Test auth services
- `core/security/*.test.js` - Test security services

### 2. API Tests

- `api/controllers/*.test.js` - Test API controllers
- `api/middleware/*.test.js` - Test middleware functions

### 3. Infrastructure Tests

- `infrastructure/storage/*.test.js` - Test storage implementations
- `infrastructure/http/*.test.js` - Test routing
- `infrastructure/config/*.test.js` - Test configuration

### 4. Legacy Auth Tests

- `auth/keyGenerator.test.js` - Test API key generation
- `auth/keyValidator.test.js` - Test API key validation
- `auth/roles.test.js` - Test role-based permissions
- `auth/adminManager.test.js` - Test admin user management
- `auth/auditLogger.test.js` - Test audit logging

### 5. Integration Tests

- `lib/KeyManagerDurableObject.test.js` - Test the Durable Object implementation

### 6. End-to-End Tests

The integration test script in `test/integration-test.sh` contains end-to-end tests that simulate real-world usage.

## Manual Testing

### Initial Setup

Test the first-time setup:

```bash
curl -X POST https://your-worker.workers.dev/setup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "test@example.com"
  }'
```

Save the returned API key for further testing.

### Admin Operations

Test creating an API key:

```bash
curl -X POST https://your-worker.workers.dev/keys \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: km_your_admin_key" \
  -d '{
    "name": "Test Key",
    "owner": "Test Service",
    "scopes": ["read:data", "write:data"]
  }'
```

Test listing API keys:

```bash
curl https://your-worker.workers.dev/keys \
  -H "X-Api-Key: km_your_admin_key"
```

Test retrieving a specific API key:

```bash
curl https://your-worker.workers.dev/keys/{key_id} \
  -H "X-Api-Key: km_your_admin_key"
```

Test revoking an API key:

```bash
curl -X DELETE https://your-worker.workers.dev/keys/{key_id} \
  -H "X-Api-Key: km_your_admin_key"
```

### Key Validation

Test validating an API key:

```bash
curl -X POST https://your-worker.workers.dev/validate \
  -H "Content-Type: application/json" \
  -d '{
    "key": "km_api_key_to_validate",
    "scopes": ["read:data"]
  }'
```

### Permission Testing

Test permission enforcement by creating a key with limited permissions:

```bash
# First, create a KEY_VIEWER admin
curl -X POST https://your-worker.workers.dev/admins \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: km_your_super_admin_key" \
  -d '{
    "name": "Viewer Admin",
    "email": "viewer@example.com",
    "role": "KEY_VIEWER"
  }'
```

Then try operations that should be forbidden:

```bash
# This should fail with a 403 response
curl -X POST https://your-worker.workers.dev/keys \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: km_your_viewer_admin_key" \
  -d '{
    "name": "Test Key",
    "owner": "Test Service",
    "scopes": ["read:data"]
  }'
```

## Common Testing Issues

### Authentication Issues

- **"Cannot read properties of undefined (reading 'valid')"**: This indicates an issue with the admin information extraction. Check that you're setting the admin headers correctly in test requests.

### KV Storage Issues

- **"KV binding not found in your environment"**: Ensure your test environment has the correct KV binding configured.

### Permission Issues

- **"Permission denied"**: Check that your test admin has the correct role and permissions.

## Test Utilities

The project includes a comprehensive test utilities package in `test/utils/` to simplify writing tests:

### Test Container

The `TestContainer` class provides a dependency injection container with pre-configured mocks:

```javascript
import { TestContainer } from '../utils/index.js';

describe('MyComponent', () => {
  let container;
  
  beforeEach(() => {
    container = new TestContainer();
  });
  
  it('should perform some action', () => {
    const service = container.resolve('keyService');
    // Test with the mocked service
  });
});
```

### Mock Factory Functions

The utilities package includes mock factory functions for different components:

```javascript
import { 
  createMockStorage,
  createMockKeyService,
  createMockRequest, 
  createMockContext
} from '../utils/index.js';

// Create a mock storage implementation
const storage = createMockStorage();

// Create a mock request for controller testing
const request = createMockRequest({
  method: 'POST',
  url: 'http://example.com/keys',
  body: { name: 'Test Key' }
});
```

### Test Environment Setup

For complete test setup with time and crypto mocking:

```javascript
import { setupTestEnvironment } from '../utils/index.js';

describe('My Test Suite', () => {
  let { container, teardown } = setupTestEnvironment({
    mockTimeValue: 1000000
  });
  
  afterEach(() => {
    teardown();
  });
  
  it('should do something', () => {
    // Test with the container and mock time
    expect(Date.now()).toBe(1000000);
  });
});
```

## Writing New Tests

When writing new tests:

1. Use the test utilities package for common setup and mocks
2. Follow the clean architecture pattern, testing each layer independently
3. Test both success and failure paths
4. Verify that permissions are correctly enforced
5. Check that audit logs are created as expected

Example Controller test:

```javascript
import { TestContainer, createMockRequest, createMockContext } from '../utils/index.js';
import { KeysController } from '../../src/api/controllers/KeysController.js';

describe('KeysController', () => {
  let container;
  let controller;
  
  beforeEach(() => {
    container = new TestContainer();
    controller = new KeysController({
      keyService: container.resolve('keyService'),
      authService: container.resolve('authService'),
      commandBus: container.resolve('commandBus'),
      auditLogger: container.resolve('auditLogger'),
    });
  });
  
  it('should create a key', async () => {
    const request = createMockRequest({
      method: 'POST',
      body: { name: 'Test Key', owner: 'test@example.com' }
    });
    
    const context = createMockContext();
    
    const response = await controller.createKey(request, context);
    
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
  });
});
```

## Testing the Audit Log

To verify that actions are being logged correctly:

```javascript
it('should log admin actions', async () => {
  // Mock the KV store
  const mockKV = {
    put: jest.fn(),
    get: jest.fn(),
    list: jest.fn().mockResolvedValue({ keys: [] })
  };
  
  const mockEnv = { KV: mockKV };
  
  // Perform an action
  await logAdminAction('admin-id', 'test_action', { test: true }, mockEnv);
  
  // Verify log was created
  expect(mockKV.put).toHaveBeenCalled();
  expect(mockKV.put.mock.calls[0][0]).toMatch(/^log:admin:/);
});
```

## Performance Testing

For performance testing, use wrk or Apache Bench:

```bash
wrk -t12 -c400 -d30s https://your-worker.workers.dev/validate
```

Monitor the response times and error rates to ensure your implementation can handle the expected load.
