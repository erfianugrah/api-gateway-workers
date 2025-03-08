# Key Manager Workers - Development Guide

## Project Overview
Key Manager Workers is a secure, scalable API key management service built on Cloudflare Workers. It supports:
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