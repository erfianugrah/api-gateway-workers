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

The tests are organized to cover different aspects of the API Key Manager:

### 1. Unit Tests

- `auth/keyGenerator.test.js` - Test API key generation
- `auth/keyValidator.test.js` - Test API key validation
- `auth/roles.test.js` - Test role-based permissions
- `auth/adminManager.test.js` - Test admin user management
- `auth/auditLogger.test.js` - Test audit logging

### 2. Integration Tests

- `integration/setup.test.js` - Test first-time setup
- `integration/admin.test.js` - Test admin operations
- `integration/keys.test.js` - Test API key management

### 3. End-to-End Tests

The `e2e.test.js` file contains end-to-end tests that simulate real-world usage.

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

## Writing New Tests

When writing new tests:

1. Use the `jest.mock()` function to mock the KV namespace
2. Create test fixtures for API keys and admin users
3. Test both success and failure paths
4. Verify that permissions are correctly enforced
5. Check that audit logs are created as expected

Example test:

```javascript
describe('Admin API key creation', () => {
  it('should create an admin key with the correct permissions', async () => {
    const adminData = {
      name: 'Test Admin',
      email: 'test@example.com',
      role: 'KEY_ADMIN'
    };
    
    const adminKey = await createAdminKey(adminData, mockEnv);
    
    expect(adminKey).toBeDefined();
    expect(adminKey.scopes).toContain('admin:keys:create');
    expect(adminKey.scopes).toContain('admin:keys:read');
    expect(adminKey.scopes).toContain('admin:keys:revoke');
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
