# Testing Guide for API Key Manager

This guide provides instructions for testing the API Key Manager with the Clean Architecture and Command pattern implementation.

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
ENCRYPTION_KEY=test-encryption-key-for-testing-only
HMAC_SECRET=test-hmac-secret-for-testing-only
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

For watching files during development:

```bash
npm run test:watch
```

For running a specific test file:

```bash
NODE_OPTIONS=--experimental-vm-modules jest path/to/test.js
```

For running a specific test:

```bash
NODE_OPTIONS=--experimental-vm-modules jest path/to/test.js -t "test name"
```

## Test Structure

The tests are organized to mirror the Clean Architecture layers of the application:

### 1. Domain Layer Tests

Tests for core business entities and services:

- `test/core/keys/KeyService.test.js` - Tests for the key service
- `test/core/auth/AuthService.test.js` - Tests for authentication service
- `test/core/security/*.test.js` - Tests for security services

### 2. Command Tests

Tests for command objects that represent user intentions:

- `test/core/keys/commands/CreateKeyCommand.test.js` - Tests for key creation command
- `test/core/keys/commands/GetKeyCommand.test.js` - Tests for key retrieval command
- `test/core/keys/commands/ListKeysCommand.test.js` - Tests for key listing command
- `test/core/keys/commands/RevokeKeyCommand.test.js` - Tests for key revocation command
- `test/core/keys/commands/RotateKeyCommand.test.js` - Tests for key rotation command
- `test/core/keys/commands/ValidateKeyCommand.test.js` - Tests for key validation command

### 3. Handler Tests

Tests for command handlers that implement business logic:

- `test/core/keys/handlers/CreateKeyHandler.test.js` - Tests for key creation handler
- `test/core/keys/handlers/GetKeyHandler.test.js` - Tests for key retrieval handler
- `test/core/keys/handlers/ListKeysHandler.test.js` - Tests for key listing handler
- `test/core/keys/handlers/RevokeKeyHandler.test.js` - Tests for key revocation handler
- `test/core/keys/handlers/RotateKeyHandler.test.js` - Tests for key rotation handler
- `test/core/keys/handlers/ValidateKeyHandler.test.js` - Tests for key validation handler

### 4. API Tests

Tests for controllers and middleware:

- `test/api/controllers/KeysController.test.js` - Tests API endpoints for key management
- `test/api/controllers/ValidationController.test.js` - Tests API endpoints for key validation
- `test/api/controllers/SystemController.test.js` - Tests system endpoints
- `test/api/middleware/*.test.js` - Tests middleware functions

### 5. Infrastructure Tests

Tests for infrastructure components:

- `test/infrastructure/storage/DurableObjectRepository.test.js` - Tests for storage
- `test/infrastructure/http/Router.test.js` - Tests for HTTP routing
- `test/infrastructure/di/Container.test.js` - Tests for dependency injection

### 6. Integration Tests

- `test/lib/KeyManagerDurableObject.test.js` - Tests the Durable Object implementation
- `test/lib/router.test.js` - Tests the router implementation

### 7. End-to-End Tests

The integration test script in `test/integration-test.sh` contains end-to-end tests that simulate real-world usage.

## Testing Command and Handler Classes

The Command pattern organizes business logic into command objects and their handlers. Here's how to test them:

### Testing Command Objects

Command objects are data structures that encapsulate user intentions:

```javascript
import { GetKeyCommand } from '../../../src/core/keys/commands/GetKeyCommand.js';

describe('GetKeyCommand', () => {
  it('should create command with required fields', () => {
    const command = new GetKeyCommand('key-123');
    
    expect(command.keyId).toBe('key-123');
    expect(command.constructor.name).toBe('GetKeyCommand');
  });
  
  it('should throw if required fields are missing', () => {
    expect(() => new GetKeyCommand()).toThrow();
  });
});
```

### Testing Command Handlers

Command handlers contain the business logic:

```javascript
import { GetKeyHandler } from '../../../src/core/keys/handlers/GetKeyHandler.js';
import { GetKeyCommand } from '../../../src/core/keys/commands/GetKeyCommand.js';
import { TestContainer } from '../../utils/TestContainer.js';

describe('GetKeyHandler', () => {
  let container;
  let handler;
  let mockKeyService;
  
  beforeEach(() => {
    container = new TestContainer();
    mockKeyService = container.resolve('keyService');
    handler = new GetKeyHandler({ keyService: mockKeyService });
  });
  
  it('should retrieve a key', async () => {
    // Mock the key service to return a test key
    mockKeyService.getKey.mockResolvedValue({ id: 'key-123', name: 'Test Key' });
    
    // Create a command
    const command = new GetKeyCommand('key-123');
    
    // Execute the handler
    const result = await handler.handle(command);
    
    // Verify results
    expect(result.id).toBe('key-123');
    expect(result.name).toBe('Test Key');
    expect(mockKeyService.getKey).toHaveBeenCalledWith('key-123');
  });
  
  it('should throw if key not found', async () => {
    // Mock the key service to return null
    mockKeyService.getKey.mockResolvedValue(null);
    
    // Create a command
    const command = new GetKeyCommand('not-found');
    
    // Execute the handler and expect an error
    await expect(handler.handle(command)).rejects.toThrow();
  });
});
```

## Test Utilities

The project includes a comprehensive test utilities package in `test/utils/` to simplify writing tests:

### TestContainer

The `TestContainer` class provides a dependency injection container with pre-configured mocks:

```javascript
import { TestContainer } from '../utils/TestContainer.js';

describe('MyComponent', () => {
  let container;
  
  beforeEach(() => {
    container = new TestContainer();
  });
  
  it('should perform some action', () => {
    // Get a mock service
    const keyService = container.resolve('keyService');
    
    // Configure the mock
    keyService.createKey.mockResolvedValue({ id: 'key-123' });
    
    // Use the mock in your test
    const component = new MyComponent(keyService);
    const result = await component.doSomething();
    
    // Verify the mock was called
    expect(keyService.createKey).toHaveBeenCalled();
  });
});
```

### Mock Factories

The utilities package includes mock factory functions for different components:

```javascript
import { 
  createMockStorage,
  createMockRequest, 
  createMockEnvironment,
  createTestKey
} from '../utils/factories.js';

// Create a mock storage implementation
const storage = createMockStorage();

// Create a mock request
const request = createMockRequest({
  method: 'POST',
  url: 'http://example.com/keys',
  body: { name: 'Test Key' }
});

// Create a test environment
const env = createMockEnvironment();

// Create a test API key
const key = createTestKey({ 
  name: 'Test Key',
  scopes: ['read:data']
});
```

### Testing Controllers with TestContainer

Testing controllers with the TestContainer simplifies dependency management:

```javascript
import { TestContainer } from '../../utils/TestContainer.js';
import { KeysController } from '../../../src/api/controllers/KeysController.js';
import { createMockRequest, createMockEnvironment } from '../../utils/factories.js';

describe('KeysController', () => {
  let container;
  let controller;
  let commandBus;
  
  beforeEach(() => {
    // Create the test container
    container = new TestContainer();
    
    // Get the mock CommandBus
    commandBus = container.resolve('commandBus');
    
    // Create the controller with dependencies from the container
    controller = new KeysController({
      commandBus,
      authService: container.resolve('authService'),
      auditLogger: container.resolve('auditLogger')
    });
  });
  
  it('should create a key', async () => {
    // Configure the CommandBus to return a test key
    commandBus.execute.mockResolvedValue({ 
      id: 'key-123', 
      name: 'Test Key' 
    });
    
    // Create a mock request
    const request = createMockRequest({
      method: 'POST',
      body: { name: 'Test Key', owner: 'test@example.com' }
    });
    
    // Create a mock environment
    const env = createMockEnvironment();
    
    // Execute the controller method
    const response = await controller.createKey(request, env);
    
    // Verify the response
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe('key-123');
    
    // Verify the CommandBus was called with the right command
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        constructor: {
          name: 'CreateKeyCommand'
        },
        name: 'Test Key'
      })
    );
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

## Testing Permissions and Audit Logging

### Testing Permissions

```javascript
it('should enforce required permissions', async () => {
  // Configure the auth service to deny permission
  const authService = container.resolve('authService');
  authService.hasPermission.mockReturnValue(false);
  
  // Create a mock request
  const request = createMockRequest();
  const env = createMockEnvironment();
  
  // Execute the controller method and expect an error
  await expect(controller.createKey(request, env))
    .rejects.toThrow('Permission denied');
    
  // Verify permission was checked
  expect(authService.hasPermission).toHaveBeenCalledWith(
    expect.anything(),
    'create:keys'
  );
});
```

### Testing Audit Logging

```javascript
it('should log admin actions', async () => {
  // Configure the CommandBus to succeed
  commandBus.execute.mockResolvedValue({ id: 'key-123' });
  
  // Create a mock request and admin
  const request = createMockRequest();
  const env = createMockEnvironment();
  
  // Configure the auth service to return an admin
  const authService = container.resolve('authService');
  authService.getRequestAdmin.mockReturnValue({ id: 'admin-123' });
  
  // Execute the controller method
  await controller.createKey(request, env);
  
  // Verify audit logging
  const auditLogger = container.resolve('auditLogger');
  expect(auditLogger.logAdminAction).toHaveBeenCalledWith(
    'admin-123',
    'key:create',
    expect.any(Object)
  );
});
```

## Performance Testing

For performance testing, use wrk or Apache Bench:

```bash
wrk -t12 -c400 -d30s https://your-worker.workers.dev/validate
```

Monitor the response times and error rates to ensure your implementation can handle the expected load.

## Debugging Tests

If tests are failing, try these debugging techniques:

1. Use console.log in your tests (output appears in the Jest console)
2. Run a single test with `npm test -- -t "test name"` for focused debugging
3. Inspect mock calls with `mockFn.mock.calls` to see what arguments were passed
4. Use Jest's `mockImplementation` to add custom behavior to mocks
5. Check that TestContainer is correctly configured for your test

Example debugging test:

```javascript
it('should debug a failing test', async () => {
  // Inspect the mock
  console.log('Mock setup:', mockKeyService);
  
  // Execute the code
  const result = await handler.handle(command);
  
  // Inspect the result
  console.log('Result:', result);
  
  // Inspect what was called on the mock
  console.log('Mock calls:', mockKeyService.getKey.mock.calls);
});
```

## Understanding Error Logs in Tests

Some tests intentionally log errors to verify error handling. These are expected and are part of testing the system's resilience. Examples include:

1. **Storage failure scenarios** in ApiKeyManager.advanced.test.js and admin-keys-exist.test.js:
   ```
   Error creating API key: Error: Storage failure
   Error validating API key: Error: Storage failure
   Error checking for admin keys: Error: Storage failure
   ```

2. **Permission errors** in controller tests:
   ```
   Error processing request: Error: You do not have permission: admin:keys:read
   ```

3. **Alarms not supported** in DurableObject tests:
   ```
   Alarms not supported in this environment - scheduled maintenance disabled
   ```

These logs do not indicate test failures - they are part of verifying that the code correctly handles and logs errors.

## Test Structure for Admin Functions

The admin management functions have been separated into dedicated test files for clarity:

1. **admin-keys-exist.test.js** - Tests the adminKeysExist function
2. **setup-first-admin.test.js** - Tests the setupFirstAdmin function
3. **create-admin-key.test.js** - Tests the createAdminKey function
4. **revoke-admin-key.test.js** - Tests the revokeAdminKey function

This separation allows for more focused testing of each admin function and better error handling coverage.

## Current Test Status

All 264 tests are passing. The console errors seen during test runs are expected and are part of testing error handling paths.

If you encounter persistent test failures:

1. Check for environment variables needed by tests
2. Verify mocking configurations are correct
3. Review import paths for test utilities
4. Check for recent changes to the implementation being tested