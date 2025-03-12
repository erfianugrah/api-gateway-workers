# API Gateway Testing Guide

This comprehensive guide covers the testing methodology, architecture, and practices used in the API Gateway Workers project.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Categories](#test-categories)
- [Testing Tools](#testing-tools)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Mocking Patterns](#mocking-patterns)
- [Testing ES Modules](#testing-es-modules)
- [Testing Command Pattern](#testing-command-pattern)
- [Testing with Durable Objects](#testing-with-durable-objects)
- [Integration Tests](#integration-tests)

## Testing Philosophy

The API Gateway Workers project follows these testing principles:

1. **Test Behavior, Not Implementation**: Focus on testing what components do, not how they do it
2. **Isolation**: Tests should be independent and not rely on other tests
3. **Mocking External Dependencies**: Use mocks for external services to ensure tests are reliable
4. **Clean Setup and Teardown**: Each test should start with a clean state
5. **Comprehensive Coverage**: Aim for high test coverage across all components

## Test Categories

The project includes several types of tests:

1. **Unit Tests**: Test individual functions and classes in isolation
2. **Integration Tests**: Test interactions between components
3. **End-to-End Tests**: Test the complete system from API to storage
4. **Command Tests**: Verify command objects and their handlers
5. **Controller Tests**: Test API controllers and routing

## Testing Tools

The project uses the following testing tools:

- **Jest**: Primary test runner and assertion library
- **Mock Service Worker**: For mocking HTTP requests
- **Miniflare**: For testing Cloudflare Workers in a local environment
- **Custom Test Utilities**: Helper functions for common testing tasks

## Running Tests

### Running All Tests

```bash
npm test
```

### Running Tests in Watch Mode

```bash
npm run test:watch
```

### Running Tests with Coverage

```bash
npm run test:coverage
```

### Running Specific Tests

```bash
NODE_OPTIONS=--experimental-vm-modules jest path/to/test.js -t "test name"
```

### Running Integration Tests

```bash
npm run test:integration
```

## Writing Tests

### Test File Structure

Test files should follow this structure:

```javascript
import { functionToTest } from '../src/path/to/file.js';

describe('Component or function name', () => {
  let dependencies;
  
  beforeEach(() => {
    // Set up dependencies and mocks
    dependencies = {
      dependency1: jest.fn(),
      dependency2: jest.fn()
    };
  });
  
  afterEach(() => {
    // Clean up any resources
    jest.resetAllMocks();
  });
  
  test('should do something when condition', async () => {
    // Arrange
    const input = 'test input';
    dependencies.dependency1.mockReturnValue('mocked value');
    
    // Act
    const result = await functionToTest(input, dependencies);
    
    // Assert
    expect(result).toBe('expected value');
    expect(dependencies.dependency1).toHaveBeenCalledWith(input);
  });
});
```

### Best Practices

1. Use descriptive test names that explain the expected behavior
2. Follow the AAA pattern: Arrange, Act, Assert
3. Use beforeEach and afterEach for setup and teardown
4. Test both success and error cases
5. Use mock functions to isolate the unit being tested

## Mocking Patterns

### Dependency Injection

The API Gateway Workers uses dependency injection to make components testable:

```javascript
// Production code
export class KeysController {
  constructor(dependencies) {
    this.keyService = dependencies.keyService;
    this.logger = dependencies.logger;
  }
  
  async getKey(request) {
    // Implementation
  }
}

// Test code
test('getKey should return key data', async () => {
  const mockKeyService = {
    getKey: jest.fn().mockResolvedValue({ id: '123', name: 'test key' })
  };
  const mockLogger = { info: jest.fn(), error: jest.fn() };
  
  const controller = new KeysController({ 
    keyService: mockKeyService, 
    logger: mockLogger 
  });
  
  const result = await controller.getKey({ params: { id: '123' } });
  
  expect(result).toEqual({ id: '123', name: 'test key' });
  expect(mockKeyService.getKey).toHaveBeenCalledWith('123');
});
```

### Mocking Environment Variables

For tests that need to mock environment variables:

```javascript
describe('with environment variables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should use environment variable', () => {
    process.env.CONFIG_LOGGING_LEVEL = 'debug';
    const { config } = require('../src/config.js');
    expect(config.logging.level).toBe('debug');
  });
});
```

## Testing ES Modules

The API Gateway Workers uses ES Modules, which requires special handling in Jest:

1. Configure Jest to use the experimental modules feature:
   ```json
   // jest.config.js
   {
     "transform": {},
     "extensionsToTreatAsEsm": [".js"],
     "moduleNameMapper": {
       "^(\\.{1,2}/.*)\\.js$": "$1"
     }
   }
   ```

2. Use dynamic imports in tests:
   ```javascript
   test('should import module', async () => {
     const module = await import('../src/module.js');
     expect(module.default).toBeDefined();
   });
   ```

3. Mock ES modules with the virtual mocks approach:
   ```javascript
   // Create __mocks__ directory with mocked modules
   import { jest } from '@jest/globals';
   
   const mockFunction = jest.fn();
   
   export default mockFunction;
   ```

## Testing Command Pattern

Testing the command pattern involves testing both the command objects and their handlers:

### Testing Command Objects

```javascript
import { CreateKeyCommand } from '../src/core/commands/CreateKeyCommand.js';

describe('CreateKeyCommand', () => {
  test('should create a valid command', () => {
    const command = new CreateKeyCommand({
      name: 'Test Key',
      owner: 'test@example.com',
      scopes: ['read', 'write']
    });
    
    expect(command.name).toBe('Test Key');
    expect(command.owner).toBe('test@example.com');
    expect(command.scopes).toEqual(['read', 'write']);
  });
  
  test('should validate required fields', () => {
    expect(() => new CreateKeyCommand({
      owner: 'test@example.com',
      scopes: ['read', 'write']
    })).toThrow('Name is required');
  });
});
```

### Testing Command Handlers

```javascript
import { CreateKeyHandler } from '../src/core/handlers/CreateKeyHandler.js';
import { CreateKeyCommand } from '../src/core/commands/CreateKeyCommand.js';

describe('CreateKeyHandler', () => {
  const mockKeyRepository = {
    createKey: jest.fn().mockResolvedValue({ id: '123', name: 'Test Key' })
  };
  
  const handler = new CreateKeyHandler({ keyRepository: mockKeyRepository });
  
  test('should handle valid command', async () => {
    const command = new CreateKeyCommand({
      name: 'Test Key',
      owner: 'test@example.com',
      scopes: ['read', 'write']
    });
    
    const result = await handler.handle(command);
    
    expect(result).toEqual({ id: '123', name: 'Test Key' });
    expect(mockKeyRepository.createKey).toHaveBeenCalledWith({
      name: 'Test Key',
      owner: 'test@example.com',
      scopes: ['read', 'write']
    });
  });
});
```

## Testing with Durable Objects

The API Gateway Workers uses Durable Objects for persistence, which requires specific testing approaches:

```javascript
import { KeyManagerDO } from '../src/durable-objects/key-manager.js';

describe('KeyManagerDO', () => {
  let state;
  let env;
  let keyManager;
  
  beforeEach(() => {
    state = {
      storage: {
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        list: jest.fn().mockResolvedValue({ keys: [] })
      }
    };
    
    env = {
      ENCRYPTION_KEY: 'test-encryption-key'
    };
    
    keyManager = new KeyManagerDO(state, env);
  });
  
  test('should store key in durable object', async () => {
    state.storage.put.mockResolvedValue(undefined);
    
    await keyManager.createKey({
      name: 'Test Key',
      owner: 'test@example.com',
      scopes: ['read', 'write']
    });
    
    expect(state.storage.put).toHaveBeenCalled();
    const callArg = state.storage.put.mock.calls[0][1];
    expect(callArg.name).toBe('Test Key');
  });
});
```

## Integration Tests

Integration tests verify that components work together correctly:

```javascript
import { setupWorker } from '../src/worker.js';
import { Miniflare } from 'miniflare';

describe('API Integration Tests', () => {
  let mf;
  let worker;
  
  beforeAll(async () => {
    mf = new Miniflare({
      modules: true,
      scriptPath: './dist/worker.js',
      bindings: {
        CONFIG_LOGGING_LEVEL: 'error'
      }
    });
    
    worker = setupWorker();
  });
  
  afterAll(async () => {
    await mf.dispose();
  });
  
  test('should create and retrieve key', async () => {
    // Create key
    const createResponse = await worker.fetch(new Request(
      'https://example.com/api/keys',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Integration Key',
          owner: 'test@example.com',
          scopes: ['read']
        })
      }
    ));
    
    const createResult = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(createResult.id).toBeDefined();
    
    // Retrieve key
    const getResponse = await worker.fetch(new Request(
      `https://example.com/api/keys/${createResult.id}`,
      {
        method: 'GET',
        headers: { 'X-API-Key': 'admin-key' }
      }
    ));
    
    const getResult = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getResult.name).toBe('Test Integration Key');
  });
});
```

## Known Testing Limitations

1. **Cloudflare-specific APIs**: Some Cloudflare APIs are not fully mockable in test environments
2. **Durable Objects**: Full Durable Object functionality is limited in local testing
3. **Alarms**: Durable Object alarms are not supported in test environments

## Further Reading

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Cloudflare Workers Testing Guide](https://developers.cloudflare.com/workers/testing/)
- [API Gateway Architecture](../architecture/overview.md)