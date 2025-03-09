# Test Utilities for Key Manager Workers

This package provides a collection of utilities for writing tests for the Key Manager Workers project. It aims to simplify test setup, reduce code duplication, and provide consistent patterns for testing.

## Table of Contents

- [Getting Started](#getting-started)
- [Mock Objects](#mock-objects)
- [Test Container](#test-container)
- [Testing Commands and Handlers](#testing-commands-and-handlers)
- [Test Environment](#test-environment)
- [Examples](#examples)

## Getting Started

Import the utilities you need from the main entry point:

```javascript
import { 
  // Main helpers
  setupTestEnvironment,
  TestContainer,
  
  // Mock factories
  createMockStorage,
  createMockKeyRepository,
  createMockKeyService,
  createMockAuthService,
  createMockCommandBus,
  createMockConfig,
  createMockAuditLogger,
  createMockRequest,
  createMockResponse,
  createMockContext,
  createMockEnv,
  createMockDurableObject,
  
  // Data factories
  createTestKey,
  createTestAdmin,
  
  // Helper functions
  mockTime,
  mockCrypto
} from '../utils/index.js';
```

## Mock Objects

### Storage Mocks

```javascript
// Create a mock storage
const storage = createMockStorage();

// Create a mock durable object state
const state = createMockDurableObjectState();

// Create a mock key repository
const keyRepo = createMockKeyRepository();
```

### Service Mocks

```javascript
// Create a mock key service
const keyService = createMockKeyService();

// Create a mock auth service (with custom options)
const authService = createMockAuthService({ permissionGranted: false });

// Create a mock command bus
const commandBus = createMockCommandBus();

// Create a mock config
const config = createMockConfig({
  "keys.prefix": "custom_",
  "rateLimit.defaultLimit": 50
});

// Create a mock audit logger
const auditLogger = createMockAuditLogger();
```

### HTTP Mocks

```javascript
// Create a mock request
const request = createMockRequest({
  method: "POST",
  url: "http://example.com/keys",
  headers: { "Content-Type": "application/json" },
  body: { name: "Test Key" },
  admin: createTestAdmin()
});

// Create a mock response factory
const Response = createMockResponse();

// Create a mock context with admin info
const context = createMockContext({
  admin: createTestAdmin(),
  params: { id: "test-key-id" }
});
```

### Cloudflare Mocks

```javascript
// Create a mock Cloudflare environment
const env = createMockEnv({
  kvValues: {
    "key:test-key-id": JSON.stringify({ id: "test-key-id", name: "Test" })
  }
});

// Create a mock Durable Object
const durableObject = createMockDurableObject((request) => {
  return new Response({ success: true });
});
```

## Test Container

The `TestContainer` provides a dependency injection container with pre-configured mocks:

```javascript
// Create a container with default mocks
const container = new TestContainer();

// Access a mock service
const keyService = container.resolve("keyService");

// Mock key retrieval
container.mockKey("test-key-id", { id: "test-key-id", name: "Test" });

// Mock key lookup
container.mockKeyLookup("km_test-key", "test-key-id");

// Mock permission check
container.mockPermission(false); // Deny all permissions
```

## Testing Commands and Handlers

The test utilities make it simple to test command objects and their handlers:

### Testing Commands

Commands are data objects that represent user intentions:

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

### Testing Handlers

Handlers implement business logic for commands:

```javascript
import { GetKeyHandler } from '../../../src/core/keys/handlers/GetKeyHandler.js';
import { GetKeyCommand } from '../../../src/core/keys/commands/GetKeyCommand.js';
import { TestContainer } from '../../utils/TestContainer.js';

describe('GetKeyHandler', () => {
  let container;
  let handler;
  let mockKeyService;
  
  beforeEach(() => {
    // Create a container with pre-configured mocks
    container = new TestContainer();
    
    // Get the mock key service
    mockKeyService = container.resolve('keyService');
    
    // Create the handler with dependencies from the container
    handler = new GetKeyHandler({ keyService: mockKeyService });
  });
  
  it('should retrieve a key', async () => {
    // Configure the mock service
    mockKeyService.getKey.mockResolvedValue({ 
      id: 'key-123', 
      name: 'Test Key' 
    });
    
    // Create a command
    const command = new GetKeyCommand('key-123');
    
    // Execute the handler
    const result = await handler.handle(command);
    
    // Verify the results
    expect(result.id).toBe('key-123');
    expect(result.name).toBe('Test Key');
    
    // Verify the mock was called correctly
    expect(mockKeyService.getKey).toHaveBeenCalledWith('key-123');
  });
  
  it('should throw if key not found', async () => {
    // Configure the mock to return null (key not found)
    mockKeyService.getKey.mockResolvedValue(null);
    
    // Create a command
    const command = new GetKeyCommand('not-found');
    
    // Execute the handler and expect an error
    await expect(handler.handle(command)).rejects.toThrow();
  });
});
```

### Testing with CommandBus

To test with the CommandBus, use the mock from TestContainer:

```javascript
it('should execute a command via CommandBus', async () => {
  // Get mock CommandBus from container
  const commandBus = container.resolve('commandBus');
  
  // Configure the mock response
  commandBus.execute.mockResolvedValue({ id: 'key-123', name: 'Test Key' });
  
  // Create a command
  const command = new GetKeyCommand('key-123');
  
  // Execute via command bus
  const result = await commandBus.execute(command);
  
  // Verify the result
  expect(result.id).toBe('key-123');
  
  // Verify the command bus was called with the right command
  expect(commandBus.execute).toHaveBeenCalledWith(command);
});
```

## Test Environment

For complete test setup with time mocking and cleanup:

```javascript
describe("My Test Suite", () => {
  let { container, teardown } = setupTestEnvironment({
    mockTimeValue: 1000000,
    mockCryptoOptions: { randomUUID: "test-uuid" }
  });
  
  afterEach(() => {
    teardown();
  });
  
  it("should do something", () => {
    // Test with the container
    const keyService = container.resolve("keyService");
    
    // Date and Crypto are already mocked
    expect(Date.now()).toBe(1000000);
    expect(crypto.randomUUID()).toBe("test-uuid");
  });
});
```

## Examples

### Testing a Controller

```javascript
import { TestContainer, createMockRequest, createMockContext } from '../utils/index.js';
import { KeysController } from '../../src/api/controllers/KeysController.js';

describe("KeysController", () => {
  let container;
  let controller;
  
  beforeEach(() => {
    container = new TestContainer();
    controller = new KeysController({
      keyService: container.resolve("keyService"),
      authService: container.resolve("authService"),
      commandBus: container.resolve("commandBus"),
      auditLogger: container.resolve("auditLogger"),
    });
  });
  
  it("should create a key", async () => {
    const request = createMockRequest({
      method: "POST",
      body: { name: "Test Key" }
    });
    
    const context = createMockContext();
    
    const response = await controller.createKey(request, context);
    
    expect(response.status).toBe(201);
    
    const body = await response.json();
    expect(body.id).toBeDefined();
  });
});
```

### Testing a Command Handler Chain

Test how multiple commands and handlers work together:

```javascript
describe('Key Management Flow', () => {
  let container;
  let commandBus;
  
  beforeEach(() => {
    container = new TestContainer();
    commandBus = container.resolve('commandBus');
    
    // Set up real handlers (not mocks) to test actual implementation
    const keyService = container.resolve('keyService');
    
    const createKeyHandler = new CreateKeyHandler({ keyService });
    const getKeyHandler = new GetKeyHandler({ keyService });
    const revokeKeyHandler = new RevokeKeyHandler({ keyService });
    
    // Register handlers with command bus
    commandBus.register(CreateKeyCommand, createKeyHandler);
    commandBus.register(GetKeyCommand, getKeyHandler);
    commandBus.register(RevokeKeyCommand, revokeKeyHandler);
  });
  
  it('should create, retrieve and revoke a key', async () => {
    // Create a key
    const createCommand = new CreateKeyCommand('Test Key', 'owner@example.com', ['read']);
    const key = await commandBus.execute(createCommand);
    
    // Get the key
    const getCommand = new GetKeyCommand(key.id);
    const retrievedKey = await commandBus.execute(getCommand);
    expect(retrievedKey.id).toBe(key.id);
    
    // Revoke the key
    const revokeCommand = new RevokeKeyCommand(key.id);
    await commandBus.execute(revokeCommand);
    
    // Get the key again - should be revoked
    const getCommand2 = new GetKeyCommand(key.id);
    const revokedKey = await commandBus.execute(getCommand2);
    expect(revokedKey.status).toBe('revoked');
  });
});
```