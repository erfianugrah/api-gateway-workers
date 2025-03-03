# Code Organization and Structure

This document outlines the organization and structure of the API Key Manager codebase.

## Project Structure

The project is organized as follows:

```
key-manager-workers/
├── src/                  # Source code
│   ├── handlers/         # API route handlers
│   │   ├── keys.js       # Key management endpoints
│   │   ├── system.js     # System endpoints (health, maintenance)
│   │   └── validation.js # Key validation endpoint
│   ├── lib/              # Core functionality
│   │   ├── KeyManagerDurableObject.js # Main Durable Object
│   │   └── router.js     # HTTP router implementation
│   ├── models/           # Business logic and data models
│   │   ├── ApiKeyManager.js # Key management operations
│   │   └── types.js      # Type definitions
│   ├── utils/            # Utility functions
│   │   ├── response.js   # HTTP response formatting
│   │   ├── security.js   # Security utilities (key generation, rate limiting)
│   │   ├── storage.js    # Storage key generation
│   │   └── validation.js # Input validation
│   └── index.js          # Entry point
├── test/                 # Test suite
│   ├── lib/              # Tests for core functionality
│   ├── models/           # Tests for business logic
│   ├── utils/            # Tests for utilities
│   ├── cloudflare-mock.js # Cloudflare API mocks
│   ├── integration-test.sh # Integration test script
│   ├── jest-setup.js     # Jest setup
│   ├── key-manager.simple.test.js # Simple tests
│   ├── setup.js          # Test setup
│   └── worker.simple.test.js # Worker tests
├── docs/                 # Documentation
│   ├── API.md            # API documentation
│   ├── ARCHITECTURE.md   # Architecture documentation
│   ├── ORGANIZATION.md   # This file
│   ├── QUICKSTART.md     # Quick start guide
│   └── SECURITY.md       # Security implementation details
├── .editorconfig         # Editor configuration
├── .gitignore            # Git ignore rules
├── .prettierrc           # Prettier configuration
├── .vscode/              # VS Code settings
├── CHANGELOG.md          # Version change history
├── CONTRIBUTING.md       # Contribution guidelines
├── jest.config.js        # Jest configuration
├── package-lock.json     # NPM lock file
├── package.json          # NPM package configuration
├── README.md             # Project readme
└── wrangler.jsonc        # Cloudflare Workers configuration
```

## Code Organization Principles

The codebase follows these key organizational principles:

1. **Separation of Concerns**: Different aspects of the system are separated into distinct modules.
2. **Single Responsibility**: Each file and function has a single, well-defined responsibility.
3. **Layered Architecture**: The code is organized in layers from high-level handlers to low-level utilities.
4. **Dependency Direction**: Higher-level modules depend on lower-level modules, not vice versa.
5. **Testability**: Code is structured to be easily testable with minimal mocking.

## Key Components

### Entry Point (`index.js`)

The main Cloudflare Worker entry point that:
- Handles incoming HTTP requests
- Routes requests to the appropriate Durable Object
- Provides global error handling

### Durable Object (`KeyManagerDurableObject.js`)

The persistent state container that:
- Manages API key data
- Handles internal routing
- Runs maintenance operations

### Business Logic (`ApiKeyManager.js`)

The core business logic that:
- Encapsulates API key operations
- Implements key creation, validation, and revocation
- Manages key expiration and cleanup

### Handlers (`handlers/*.js`)

API endpoint handlers that:
- Process HTTP requests
- Validate inputs
- Call business logic
- Format responses

### Utilities (`utils/*.js`)

Supporting utilities that:
- Provide security functions
- Format HTTP responses
- Validate inputs
- Manage storage keys

## Module Dependencies

The dependencies between modules flow in one direction:

```
Handlers → Business Logic → Utilities
```

This ensures:
- Lower coupling between components
- Easier testing with fewer mocks
- Simpler reasoning about code behavior
- Better maintainability

## Test Organization

Tests are organized to mirror the source code structure:

- Unit tests for individual components
- Advanced tests for security and edge cases
- Integration tests for end-to-end validation

## Documentation Organization

Documentation is organized by purpose:

- API.md: API interface documentation
- ARCHITECTURE.md: System design documentation
- SECURITY.md: Security implementation details
- QUICKSTART.md: Getting started guide
- ORGANIZATION.md: Code organization (this file)
- README.md: Project overview
- CONTRIBUTING.md: Contribution guidelines
- CHANGELOG.md: Version history

## File Naming Conventions

The project uses the following naming conventions:

- JavaScript files: `camelCase.js`
- Test files: `componentName.test.js` or `componentName.advanced.test.js`
- Configuration files: `.configName` or `configName.js`
- Documentation files: `UPPERCASE.md`

## Coding Style

The project follows a consistent coding style, enforced by:

- ESLint: Linting rules
- Prettier: Code formatting
- EditorConfig: Editor settings
- VS Code settings: Editor integration