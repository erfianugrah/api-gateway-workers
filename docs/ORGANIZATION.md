# Code Organization and Structure

This document outlines the organization and structure of the API Key Manager codebase, which follows Clean Architecture principles.

## Project Structure

The project is organized according to Clean Architecture layers:

```
key-manager-workers/
├── src/                  # Source code
│   ├── api/              # API Layer
│   │   ├── controllers/  # API controllers
│   │   │   ├── BaseController.js
│   │   │   ├── KeysController.js
│   │   │   ├── SystemController.js
│   │   │   └── ValidationController.js
│   │   └── middleware/   # HTTP middleware
│   │       ├── authMiddleware.js
│   │       ├── corsMiddleware.js
│   │       ├── errorHandler.js
│   │       └── responseMiddleware.js
│   ├── core/             # Core Business Logic Layer
│   │   ├── audit/        # Audit logging domain
│   │   │   └── AuditLogger.js
│   │   ├── auth/         # Auth domain
│   │   │   ├── AuthService.js
│   │   │   └── adapters/
│   │   │       └── ApiKeyAdapter.js
│   │   ├── command/      # Command pattern implementation
│   │   │   ├── Command.js
│   │   │   ├── CommandBus.js
│   │   │   └── CommandHandler.js
│   │   ├── errors/       # Domain errors
│   │   │   └── ApiError.js
│   │   ├── keys/         # Key management domain
│   │   │   ├── KeyRepository.js
│   │   │   ├── KeyService.js
│   │   │   ├── adapters/
│   │   │   │   └── KeyServiceAdapter.js
│   │   │   ├── commands/ # Command objects
│   │   │   │   ├── CleanupExpiredKeysCommand.js
│   │   │   │   ├── CreateKeyCommand.js 
│   │   │   │   ├── GetKeyCommand.js
│   │   │   │   ├── ListKeysCommand.js
│   │   │   │   ├── ListKeysWithCursorCommand.js
│   │   │   │   ├── RevokeKeyCommand.js
│   │   │   │   ├── RotateKeyCommand.js
│   │   │   │   └── ValidateKeyCommand.js
│   │   │   └── handlers/ # Command handlers
│   │   │       ├── CleanupExpiredKeysHandler.js
│   │   │       ├── CreateKeyHandler.js
│   │   │       ├── GetKeyHandler.js
│   │   │       ├── ListKeysHandler.js
│   │   │       ├── ListKeysWithCursorHandler.js
│   │   │       ├── RevokeKeyHandler.js
│   │   │       ├── RotateKeyHandler.js
│   │   │       └── ValidateKeyHandler.js
│   │   └── security/     # Security domain
│   │       ├── EncryptionService.js
│   │       ├── HmacService.js
│   │       ├── KeyGenerator.js
│   │       └── RateLimiter.js
│   ├── infrastructure/   # Infrastructure Layer
│   │   ├── config/       # Configuration
│   │   │   ├── Config.js
│   │   │   └── setupConfig.js
│   │   ├── di/           # Dependency injection
│   │   │   ├── Container.js
│   │   │   └── setupContainer.js
│   │   ├── http/         # HTTP infrastructure
│   │   │   └── Router.js
│   │   └── storage/      # Storage infrastructure
│   │       └── DurableObjectRepository.js
│   ├── lib/              # Core runtime functionality
│   │   ├── KeyManagerDurableObject.js # Main Durable Object
│   │   └── router.js     # HTTP router implementation
│   ├── models/           # Legacy business logic (being phased out)
│   │   ├── ApiKeyManager.js # Key management operations
│   │   └── types.js      # Type definitions
│   ├── utils/            # Utility functions
│   │   ├── response.js   # HTTP response formatting
│   │   ├── security.js   # Security utilities (key generation, rate limiting)
│   │   ├── storage.js    # Storage key generation
│   │   └── validation.js # Input validation
│   └── index.js          # Entry point
├── test/                 # Test suite (mirrors source structure)
│   ├── api/              # Tests for API layer
│   │   └── controllers/  # Controller tests
│   ├── auth/             # Legacy auth tests
│   ├── core/             # Tests for core layer
│   │   └── keys/         # Tests for key management domain
│   │       ├── commands/ # Tests for commands
│   │       └── handlers/ # Tests for handlers
│   ├── lib/              # Tests for core functionality
│   ├── models/           # Tests for business logic
│   ├── mocks/            # Mock implementations
│   ├── utils/            # Test utilities
│   │   ├── TestContainer.js # DI container for tests
│   │   └── factories.js  # Test object factories
│   ├── cloudflare-mock.js # Cloudflare API mocks
│   ├── crypto-mock.js    # Crypto mocks
│   ├── integration-test.sh # Integration test script
│   ├── jest-setup.js     # Jest setup
│   └── setup.js          # Test setup
├── docs/                 # Documentation
│   ├── API.md            # API documentation
│   ├── ARCHITECTURE.md   # Architecture documentation
│   ├── IMPROVEMENTS.md   # Future improvements
│   ├── INTEGRATION_GUIDE.md # Integration guide
│   ├── ORGANIZATION.md   # This file
│   ├── QUICKSTART.md     # Quick start guide
│   ├── SECURITY.md       # Security implementation details
│   └── TESTING_GUIDE.md  # Testing guide
├── jest.config.js        # Jest configuration
├── package-lock.json     # NPM lock file
├── package.json          # NPM package configuration
├── CHANGELOG.md          # Version change history
├── CLAUDE.md             # Claude AI helper information
├── CONTRIBUTING.md       # Contribution guidelines
├── IMPLEMENTATION.md     # Implementation details
├── LICENSE               # License file
├── README.md             # Project readme
├── SUMMARY.md            # Project summary
└── wrangler.jsonc        # Cloudflare Workers configuration
```

## Clean Architecture Layers

The codebase is organized according to Clean Architecture principles with distinct layers:

1. **Domain Layer (`src/core/`)**: 
   - Contains business logic and domain services
   - Defines domain entities, value objects, and interfaces
   - Has no dependencies on external frameworks or infrastructure

2. **Application Layer (`src/core/*/handlers/`)**: 
   - Implements use cases through command handlers
   - Acts as a bridge between the domain and interface layers
   - Uses the Command pattern for encapsulating user intentions

3. **Infrastructure Layer (`src/infrastructure/`)**: 
   - Provides technical implementations of interfaces
   - Manages configuration, storage, dependency injection
   - Adapts external frameworks to work with the application

4. **API Layer (`src/api/`)**: 
   - Handles HTTP requests and responses
   - Implements controllers for API endpoints
   - Uses middleware for cross-cutting concerns

## Key Architectural Patterns

### Command Pattern

The application uses the Command pattern for encapsulating business operations:

- Commands represent user intentions (e.g., `CreateKeyCommand`, `RevokeKeyCommand`)
- Each command is handled by a specific handler (e.g., `CreateKeyHandler`, `RevokeKeyHandler`)
- The `CommandBus` routes commands to their appropriate handlers
- Commands are immutable data objects that encapsulate all necessary information

### Dependency Injection

Dependency injection is used for loose coupling and testability:

- `Container.js` provides IoC container functionality
- Services are registered in `setupContainer.js`
- Components receive dependencies through constructor injection
- The DI container can be configured differently for tests

### Repository Pattern

The repository pattern abstracts data access:

- `KeyRepository` interface defines data access methods
- `DurableObjectRepository` provides concrete implementation
- Business logic depends only on the abstract interface
- Allows swapping storage implementations without changing domain logic

### Adapter Pattern

Adapters are used to integrate with external systems:

- `KeyServiceAdapter` adapts `ApiKeyManager` to the new architecture
- `ApiKeyAdapter` provides authentication capabilities
- Allows for gradual migration to new architecture

## Module Dependencies

Dependencies flow inward according to Clean Architecture principles:

```
API Controllers → Application Commands → Domain Services → Domain Entities
                                      ↓
                  Infrastructure Implementations
```

This ensures:
- Domain logic has no dependencies on external frameworks
- Application logic depends only on domain interfaces
- Infrastructure implementations depend on application and domain
- API depends on application commands and domain interfaces

## Test Organization

Tests mirror the source code structure:

- Unit tests for individual components
- Integration tests for testing components together
- `TestContainer` for managing dependencies in tests
- Test factories for creating test objects
- Mocks for external dependencies

## Coding Style

The project follows a consistent coding style:

- ES Modules for imports/exports
- Classes use PascalCase (e.g., `ApiKeyManager`)
- Functions/methods use camelCase (e.g., `createKey`)
- Test files follow the pattern `ComponentName.test.js`
- Documentation files use UPPERCASE.md