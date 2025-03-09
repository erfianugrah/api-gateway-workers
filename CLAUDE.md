# Key Manager Workers - Development Guide

## Project Overview
Key Manager Workers is a secure, scalable API key management service built on Cloudflare Workers, with the long-term goal of evolving into a full-fledged API gateway. It supports:
- Secure key generation and validation
- Permission-based scopes
- Expiration and rotation
- Usage tracking and rate limiting
- Durable storage
- Role-based access control
- Audit logging

## Build & Test Commands
- Build/Start: `npm run dev` or `npm start` - Starts Wrangler dev server
- Deploy: `npm run deploy` - Deploys to Cloudflare Workers
- Test: `npm test` - Runs all Jest tests
- Test (watch mode): `npm run test:watch` - Runs tests in watch mode
- Test with coverage: `npm run test:coverage` - Generates coverage report
- Run single test: `NODE_OPTIONS=--experimental-vm-modules jest path/to/test.js -t "test name"`
- Integration tests: `npm run test:integration` - Runs integration test script
- All tests: `npm run test:all` - Runs both unit and integration tests
- Linting: `npm run lint` - Runs ESLint to check code style

## Code Style Guidelines
- **Module System**: ES Modules (import/export)
- **Naming Conventions**: 
  - Classes: PascalCase (e.g., `ApiKeyManager`)
  - Functions/methods: camelCase (e.g., `createKey`, `rotateKey`)
  - Constants: UPPER_SNAKE_CASE for environment variables
- **Error Handling**: Use custom error classes (e.g., `ForbiddenError`, `UnauthorizedError`)
- **Documentation**: JSDoc comments for functions with @param and @returns
- **Testing**: Jest for unit tests, separate script for integration tests
- **Types**: Use JSDoc type annotations with descriptive parameter names
- **Structure**: Follows clean architecture principles with core, infrastructure, and API layers
- **Security**: Never log sensitive information (API keys, secrets)

## Clean Architecture Implementation

### Domain Layer (src/core)
- **Entities**: API keys with properties (id, name, owner, scopes, status)
- **Value Objects**: Commands representing user intents
- **Domain Services**: KeyService, AuthService, security services

### Application Layer (src/core/*/handlers)
- **Use Cases**: Command handlers (CreateKeyHandler, RevokeKeyHandler, etc.)
- **Command Pattern**: CommandBus routes commands to handlers

### Infrastructure Layer (src/infrastructure)
- **Repositories**: DurableObjectRepository implements KeyRepository
- **Dependency Injection**: Container class with service registration
- **Configuration**: Config service abstracts environment variables
- **HTTP**: Router handles request routing

### API Layer (src/api)
- **Controllers**: KeysController, ValidationController, SystemController
- **Middleware**: Authentication, error handling, response formatting

## Key Architecture Patterns

### Dependency Injection
- Container.js provides IoC container functionality
- Services registered in setupContainer.js
- Controllers receive dependencies through constructor

### Command Pattern
- Commands are immutable data objects (CreateKeyCommand, etc.)
- CommandBus routes commands to appropriate handlers
- Handlers contain business logic to execute commands

### Repository Pattern
- KeyRepository interface defines data access methods
- DurableObjectRepository implements storage details

### Error Handling
- ApiError class family defines domain errors
- errorHandler middleware formats error responses

## Testing Status

### Test Status
- All tests are passing (264 tests in total)
- Command objects: All command tests pass (GetKeyCommand, ListKeysCommand, CleanupExpiredKeysCommand, ValidateKeyCommand, CreateKeyCommand)
- Command handlers: All handler tests pass (GetKeyHandler, ListKeysHandler, CreateKeyHandler, CleanupExpiredKeysHandler, ValidateKeyHandler)
- Controllers: All controller tests pass (KeysController, ValidationController)
- Admin management: All admin management tests pass (adminKeysExist, setupFirstAdmin, createAdminKey, revokeAdminKey)
- Domain models: ApiKeyManager tests pass with expected error logs for storage failure scenarios
- Security utilities: All security tests pass

### Test Coverage
- Unit tests for all command objects
- Unit tests for all command handlers
- Unit tests for all controllers
- Unit tests for all admin management functions
- Unit tests for security utilities
- Integration tests for key manager durable object

### Known Test Behaviors
- Some tests intentionally log error messages as part of testing error handling - these are expected
- ApiKeyManager.advanced.test.js logs errors for storage failure scenarios - these are expected
- Durable object tests show "Alarms not supported" warnings - expected in test environment

## Refactoring Progress

### Completed
- Removed legacy handlers in src/handlers/
- Implemented command pattern with command objects and handlers
- Created comprehensive test utilities package
- Updated documentation to reflect new architecture
- Implemented clean architecture layers (domain, application, infrastructure, API)
- Fixed all failing tests across the codebase (264 tests passing)
- Implemented all command/handler pairs including ValidateKey
- Updated integration tests for new architecture
- Fixed test configurations and mocking approaches
- Improved error handling across the codebase
- Created dedicated test files for admin management functions
- Added comprehensive test coverage for edge cases and error conditions

### Remaining Work
- Implement additional command/handler pairs for RevokeKey and RotateKey
- Refine error handling for console logs in production code
- Enhance WebCrypto implementations for better security
- Add comprehensive JSDoc comments to all classes and functions
- Improve integration between command bus and controllers
- Enhance audit logging implementation
- Expand integration test coverage

### Next Steps
1. Complete RevokeKey and RotateKey command/handler implementations
2. Improve error handling in controllers to reduce error logs
3. Enhance documentation with more examples and integrations
4. Add webhooks for key lifecycle events
5. Implement user feedback from initial deployment

## API Gateway Roadmap
To evolve this project into a full-fledged API gateway, we need to implement:

### Phase 1: Foundation
- Improve request routing with regex patterns and path variables
- Enhance middleware system for request/response modification
- Add response caching capabilities with configurable TTL
- Implement proxy functionality for backend services

### Phase 2: Advanced Features
- Build service discovery and registration system
- Add load balancing across multiple backend services
- Implement request/response transformation capabilities
- Create advanced traffic management (throttling, circuit breaking)

### Phase 3: Enterprise Capabilities
- Add support for multiple protocols (gRPC, WebSockets)
- Implement API composition and aggregation
- Create performance analytics dashboard
- Add blue/green and canary deployment capabilities