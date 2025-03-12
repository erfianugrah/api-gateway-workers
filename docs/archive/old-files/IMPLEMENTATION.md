# API Gateway Implementation

This document describes the implementation details of the API Gateway service, including architecture, patterns, security features, and gateway capabilities.

## Clean Architecture Implementation

The codebase follows Clean Architecture principles, organized into layers:

1. **Domain Layer (`src/core/`)**: 
   - Contains business entities and services
   - Defines interfaces for repositories and adapters
   - Implements core business rules

2. **Application Layer (`src/core/*/handlers/`)**: 
   - Implements use cases through command handlers
   - Coordinates business operations
   - Manages domain events

3. **Infrastructure Layer (`src/infrastructure/`)**: 
   - Implements repository interfaces
   - Manages configuration and dependency injection
   - Handles enhanced HTTP routing with regex support
   - Provides proxy capabilities for API gateway functionality

4. **API Layer (`src/api/`)**: 
   - Implements controllers for HTTP endpoints
   - Handles request validation and formatting
   - Converts between HTTP and domain objects

## Command Pattern Implementation

The service uses the Command pattern to encapsulate business operations:

### Command Objects

Commands are immutable data objects that represent user intentions:

```javascript
export class CreateKeyCommand {
  constructor(name, owner, scopes, expiresAt, metadata) {
    this.name = name;
    this.owner = owner;
    this.scopes = scopes;
    this.expiresAt = expiresAt;
    this.metadata = metadata;
  }
}
```

Each command:
- Contains all data needed for the operation
- Validates its parameters
- Has no behavior, only data

### Command Handlers

Handlers implement the business logic for commands:

```javascript
export class CreateKeyHandler {
  constructor({ keyService }) {
    this.keyService = keyService;
  }

  async handle(command) {
    const { name, owner, scopes, expiresAt, metadata } = command;
    return await this.keyService.createKey(name, owner, scopes, expiresAt, metadata);
  }
}
```

Each handler:
- Receives dependencies through constructor injection
- Implements a `handle` method for a specific command
- Contains business logic for one use case
- Returns a domain entity or data

### Command Bus

The CommandBus routes commands to their handlers:

```javascript
export class CommandBus {
  constructor() {
    this.handlers = new Map();
  }

  register(commandType, handler) {
    this.handlers.set(commandType.name, handler);
  }

  async execute(command) {
    const handler = this.handlers.get(command.constructor.name);
    if (!handler) {
      throw new Error(`No handler for command ${command.constructor.name}`);
    }
    return await handler.handle(command);
  }
}
```

The CommandBus:
- Maps command types to handlers
- Executes commands by delegating to handlers
- Provides a central point for cross-cutting concerns

## API Key Features

### Key Creation and Management

1. **Key Creation**:
   - Creates API keys with name, owner, scopes
   - Generates secure random key material
   - Encrypts sensitive data
   - Adds HMAC signature for verification

2. **Key Validation**:
   - Validates API keys against stored records
   - Checks scopes and expiration
   - Verifies HMAC signatures
   - Returns validation results

3. **Key Rotation**:
   - Rotates API keys while maintaining a grace period
   - Creates a new key with the same properties
   - Links the old and new keys
   - Manages the rotation lifecycle

4. **Key Revocation**:
   - Permanently revokes API keys
   - Updates status and revocation timestamp
   - Prevents further validation

### Security Features

1. **Encryption at Rest**:
   - Uses AES-GCM encryption for sensitive key material
   - Requires an `ENCRYPTION_KEY` environment variable
   - Includes versioning for algorithm changes

2. **HMAC Signatures**:
   - Every key gets an HMAC signature based on its ID
   - Signatures are verified during validation
   - Prevents forged or tampered keys

3. **Role-Based Access Control**:
   - Assigns roles to admin API keys
   - Controls permissions based on roles
   - Restricts administrative operations

### Data Management

1. **Durable Object Storage**:
   - Uses Cloudflare Durable Objects for persistence
   - Implements transaction support
   - Provides atomicity for critical operations

2. **Cursor-based Pagination**:
   - Efficient listing of API keys
   - Uses cursors for consistent pagination
   - Scales to large datasets

## Configuration

### Core Configuration Variables

The following environment variables should be set:

- `ENCRYPTION_KEY`: Secret key for encrypting API keys at rest
- `HMAC_SECRET`: Secret for generating HMAC signatures

### API Gateway Configuration Variables

For the API gateway functionality, these additional variables can be set:

- `ROUTING_API_VERSIONING_ENABLED`: Enable/disable API versioning (default: true)
- `API_VERSION_CURRENT`: Current API version (default: "1")
- `API_VERSIONS_SUPPORTED`: Comma-separated list of supported versions (default: "1")
- `API_VERSIONS_DEPRECATED`: Comma-separated list of deprecated versions
- `PROXY_ENABLED`: Enable/disable proxy functionality (default: false)
- `PROXY_TIMEOUT`: Default timeout in milliseconds for proxied requests (default: 30000)
- `PROXY_RETRY_ENABLED`: Enable/disable retry mechanism (default: true)
- `PROXY_RETRY_MAX_ATTEMPTS`: Maximum retry attempts (default: 3)
- `PROXY_CIRCUIT_BREAKER_ENABLED`: Enable/disable circuit breaker (default: true)

## Testing Implementation

The codebase is designed for testability:

1. **Dependency Injection**:
   - All components receive dependencies through constructor
   - TestContainer provides mock dependencies for tests
   - Allows easy mocking and isolation

2. **Interface-based Design**:
   - Components depend on interfaces, not implementations
   - Repository pattern abstracts storage details
   - Easy to swap implementations for testing

3. **Command Pattern Benefits**:
   - Commands are pure data objects, easy to test
   - Handlers contain isolated business logic
   - CommandBus centralizes command execution

### Test Organization

Tests mirror the source code structure:
- Command tests verify command parameters and validation
- Handler tests verify business logic implementation
- Controller tests verify HTTP handling
- Integration tests verify complete workflows

## API Gateway Features

### Enhanced Routing

1. **Regex Pattern Matching**:
   - Router supports three types of routes in order of priority:
     - Exact path matching (highest priority)
     - Path parameter matching (medium priority)
     - Regex pattern matching (lowest priority)
   - Provides fine-grained control over URL pattern matching

2. **Parameter Validation**:
   - Validates path parameters against predefined patterns
   - Supports patterns for common types like UUID, dates, etc.
   - Provides early validation before handler execution

3. **API Versioning**:
   - Configuration-driven API version management
   - Automatic route generation for supported versions
   - Version header support and response metadata
   - Deprecation capabilities for older versions

### Proxy Capabilities

1. **Request Forwarding**:
   - Forwards requests to upstream services
   - Handles all HTTP methods (GET, POST, PUT, DELETE, etc.)
   - Preserves headers and request bodies
   - Supports customizable timeouts

2. **Path Rewriting**:
   - Transforms request paths before forwarding
   - Supports prefix stripping for clean URLs
   - Pattern-based rewriting with regex support
   - Service-specific rewrite rules

3. **Fault Tolerance**:
   - Circuit breaker pattern prevents cascading failures
   - Configurable retry mechanism with backoff
   - Timeout management with request cancellation
   - Error handling and failure tracking

### Configuration

The API Gateway functionality uses centralized configuration:

```javascript
// Routing configuration
routing: {
  versioning: {
    enabled: true,
    current: "1",
    supported: ["1"],
    deprecated: []
  },
  paramValidation: {
    id: "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}",
    date: "\\d{4}-\\d{2}-\\d{2}"
  }
}

// Proxy configuration
proxy: {
  enabled: true,
  timeout: 30000,
  services: {
    // Service definitions
  }
}
```

## Implemented Gateway Features

1. **Enhanced Routing**
   - Regex pattern matching for flexible route definitions
   - Path parameter validation with configurable patterns
   - API versioning with configuration-driven support
   - Priority-based route matching

2. **Proxy Capabilities**
   - Request forwarding to upstream services
   - Path rewriting and transformation
   - Header manipulation at multiple levels
   - Circuit breaker for fault tolerance
   - Retry mechanism with exponential backoff

3. **Security Features**
   - Rate limiting for API endpoints
   - Header validation and sanitization
   - Timeout management for proxied requests
   - Error handling with consistent responses

## Future Improvements

1. Add full key material rotation (re-encrypt all keys)
2. Implement key hierarchies and delegated permissions
3. Add webhook notifications for key lifecycle events
4. Implement response caching with configurable TTL
5. Implement event sourcing for audit trails
6. Add bulk operations for key management
7. Enhance proxy with service discovery mechanisms
8. Implement load balancing for upstream services
9. Add request/response transformations
10. Support multiple protocols (gRPC, WebSockets)
11. Implement blue/green and canary deployment capabilities
12. Create performance analytics dashboard