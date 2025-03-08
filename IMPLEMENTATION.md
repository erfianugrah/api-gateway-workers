# Key Manager Workers Implementation

This document describes the implementation details of the key manager service, including architecture, patterns, and security features.

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
   - Handles HTTP routing and request/response

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

The following environment variables should be set:

- `ENCRYPTION_KEY`: Secret key for encrypting API keys at rest
- `HMAC_SECRET`: Secret for generating HMAC signatures

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

## Future Improvements

1. Add full key material rotation (re-encrypt all keys)
2. Implement key hierarchies and delegated permissions
3. Add webhook notifications for key lifecycle events
4. Improve caching for frequently validated keys
5. Implement event sourcing for audit trails
6. Add bulk operations for key management