# Test Utilities for Key Manager Workers

This package provides a collection of utilities for writing tests for the Key Manager Workers project. It aims to simplify test setup, reduce code duplication, and provide consistent patterns for testing.

## Table of Contents

- [Getting Started](#getting-started)
- [Mock Objects](#mock-objects)
- [Test Container](#test-container)
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