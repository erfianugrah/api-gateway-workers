# Directory Structure

This document explains the organization of the API Gateway Workers codebase, following Clean Architecture principles.

## High-Level Structure

The project follows this high-level directory structure:

```
/
├── src/                  # Source code
│   ├── api/              # API layer (controllers, routes, middleware)
│   ├── core/             # Core domain and application logic
│   ├── infrastructure/   # Infrastructure implementations
│   ├── durable-objects/  # Cloudflare Durable Objects
│   └── utils/            # Utility functions
├── test/                 # Test files
├── schemas/              # JSON Schemas for validation
├── scripts/              # Build and utility scripts
├── docs/                 # Documentation
└── config/               # Configuration files
```

## Detailed Structure

### Source Code (`src/`)

The source directory follows Clean Architecture principles with layers organized by domain responsibility:

```
src/
├── api/                       # API Layer
│   ├── controllers/           # Request handlers
│   │   ├── KeysController.js
│   │   ├── ValidationController.js
│   │   └── SystemController.js
│   ├── middleware/            # HTTP middleware
│   │   ├── errorHandler.js
│   │   ├── authentication.js
│   │   └── cors.js
│   └── routes.js              # URL routing definitions
├── core/                      # Core business logic (domain and application)
│   ├── domain/                # Domain layer (entities and interfaces)
│   │   ├── ApiKey.js          # Key entity
│   │   ├── KeyRepository.js   # Repository interface
│   │   └── errors/            # Domain-specific errors
│   ├── application/           # Application layer (use cases)
│   │   ├── commands/          # Command objects
│   │   │   ├── CreateKeyCommand.js
│   │   │   ├── GetKeyCommand.js
│   │   │   ├── ListKeysCommand.js
│   │   │   ├── RevokeKeyCommand.js
│   │   │   ├── RotateKeyCommand.js
│   │   │   └── ValidateKeyCommand.js
│   │   ├── handlers/          # Command handlers (use cases)
│   │   │   ├── CreateKeyHandler.js
│   │   │   ├── GetKeyHandler.js
│   │   │   ├── ListKeysHandler.js
│   │   │   ├── RevokeKeyHandler.js
│   │   │   ├── RotateKeyHandler.js
│   │   │   └── ValidateKeyHandler.js
│   │   └── CommandBus.js      # Command dispatcher
│   └── services/              # Domain services
│       ├── KeyService.js
│       ├── SecurityService.js
│       └── LogService.js
├── infrastructure/            # Infrastructure layer
│   ├── repositories/          # Repository implementations
│   │   └── DurableObjectRepository.js
│   ├── config/                # Configuration system
│   │   ├── Config.js
│   │   ├── ConfigLoader.js
│   │   └── SchemaValidator.js
│   ├── proxy/                 # API Gateway proxy functionality
│   │   ├── ProxyService.js
│   │   ├── CircuitBreaker.js
│   │   └── RetryMechanism.js
│   ├── logging/               # Logging implementation
│   │   └── Logger.js
│   └── Container.js           # Dependency injection container
├── durable-objects/           # Cloudflare Durable Objects
│   ├── key-manager.js         # Key storage implementation
│   └── rate-limiter.js        # Rate limiting implementation
├── utils/                     # Utility functions
│   ├── crypto.js
│   ├── validation.js
│   └── headers.js
└── worker.js                  # Main worker entry point
```

### Tests (`test/`)

Tests are organized to mirror the structure of the source code:

```
test/
├── unit/                      # Unit tests
│   ├── api/                   # API layer tests
│   │   ├── controllers/
│   │   └── middleware/
│   ├── core/                  # Core layer tests
│   │   ├── domain/
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   └── handlers/
│   │   └── services/
│   └── infrastructure/        # Infrastructure layer tests
│       ├── repositories/
│       └── config/
├── integration/               # Integration tests
│   ├── api/
│   └── key-management/
├── e2e/                       # End-to-end tests
├── fixtures/                  # Test fixtures and data
└── utils/                     # Test utilities
```

### Schemas (`schemas/`)

JSON Schema definitions for validation:

```
schemas/
├── config.schema.json         # Configuration schema
├── api-key.schema.json        # API Key validation schema
└── request/                   # Request validation schemas
    ├── create-key.schema.json
    └── validate-key.schema.json
```

### Scripts (`scripts/`)

Build and utility scripts:

```
scripts/
├── build.js                   # Build script
├── test-integration.js        # Integration test runner
└── generate-docs.js           # Documentation generator
```

### Documentation (`docs/`)

Project documentation:

```
docs/
├── README.md                  # Documentation entry point
├── guides/                    # User guides
│   ├── quick-start.md
│   ├── tutorials.md
│   └── integration-guide.md
├── reference/                 # Reference documentation
│   ├── api-reference.md
│   ├── configuration-reference.md
│   └── error-reference.md
├── architecture/              # Architecture documentation
│   ├── overview.md
│   ├── clean-architecture.md
│   └── command-pattern.md
└── development/               # Developer documentation
    ├── contributing.md
    └── testing.md
```

### Configuration (`config/`)

Configuration files:

```
config/
├── config.example.json        # Example configuration
├── config.development.json    # Development configuration
└── config.test.json           # Test configuration
```

## Code Organization Principles

The code is organized according to the following principles:

### 1. Separation by Layer

Files are organized by architectural layer (API, Core, Infrastructure) according to Clean Architecture principles:

- **Core Layer**: Contains domain models, interfaces, and business logic
- **API Layer**: Contains controllers and HTTP-specific code
- **Infrastructure Layer**: Contains implementations of interfaces defined in the core layer

### 2. Feature Organization within Layers

Within each layer, code is organized by feature or responsibility:

- **Commands and Handlers**: Grouped by related functionality (key creation, validation, etc.)
- **Controllers**: Separated by API resource or responsibility 
- **Repositories**: Organized by the entity they manage

### 3. Dependency Direction

Dependencies flow inward:

- Infrastructure depends on Core
- API depends on Core
- Core doesn't depend on Infrastructure or API

### 4. Interface and Implementation Separation

Interfaces and implementations are separated:

- Interfaces are defined in the Core layer
- Implementations are in the Infrastructure layer

## Naming Conventions

The project follows consistent naming conventions:

### Files and Directories

- **PascalCase** for classes: `ApiKey.js`, `KeysController.js`
- **camelCase** for utilities and non-class files: `routes.js`, `errorHandler.js`
- **kebab-case** for multi-word filenames not containing classes: `rate-limiter.js`

### Classes and Interfaces

- **Commands**: `CreateKeyCommand`, `ValidateKeyCommand`
- **Handlers**: `CreateKeyHandler`, `ValidateKeyHandler`
- **Controllers**: `KeysController`, `ValidationController`
- **Services**: `KeyService`, `SecurityService`
- **Repositories**: `KeyRepository`, `DurableObjectRepository`

## Import Conventions

The project uses ES Modules with consistent import patterns:

```javascript
// Core domain imports
import { ApiKey } from '../domain/ApiKey.js';
import { KeyRepository } from '../domain/KeyRepository.js';

// Application layer imports
import { CreateKeyCommand } from '../commands/CreateKeyCommand.js';

// Infrastructure imports
import { Logger } from '../../infrastructure/logging/Logger.js';

// Third-party imports
import { Router } from 'itty-router';
```

## Command Pattern Structure

The Command Pattern implementation follows a consistent structure:

1. **Commands**: Immutable objects defining the operation and parameters
2. **Handlers**: Classes that execute the business logic for commands
3. **Command Bus**: Routes commands to their handlers

Example:

```javascript
// Command
export class CreateKeyCommand {
  constructor({ name, owner, scopes }) {
    this.name = name;
    this.owner = owner;
    this.scopes = scopes;
  }
}

// Handler
export class CreateKeyHandler {
  constructor({ keyRepository }) {
    this.keyRepository = keyRepository;
  }
  
  async handle(command) {
    // Business logic
    return this.keyRepository.createKey({
      name: command.name,
      owner: command.owner,
      scopes: command.scopes
    });
  }
}

// Command Bus Usage
const command = new CreateKeyCommand({
  name: 'API Key',
  owner: 'user@example.com',
  scopes: ['read', 'write']
});

const result = await commandBus.execute(command);
```

## Controllers and Routes

Controllers and routes follow a consistent pattern:

1. **Controllers**: Handle HTTP-specific logic and convert to/from domain objects
2. **Routes**: Map URL paths to controller methods

Example:

```javascript
// KeysController.js
export class KeysController {
  constructor({ commandBus }) {
    this.commandBus = commandBus;
  }
  
  async createKey(request) {
    const command = new CreateKeyCommand(request.body);
    const result = await this.commandBus.execute(command);
    return { status: 201, body: result };
  }
}

// routes.js
export function setupRoutes(router, controllers) {
  router.post('/api/keys', controllers.keysController.createKey.bind(controllers.keysController));
}
```

## See Also

- [Architecture Overview](overview.md) - High-level system architecture
- [Clean Architecture](clean-architecture.md) - Clean architecture implementation
- [Command Pattern](command-pattern.md) - Command pattern implementation details