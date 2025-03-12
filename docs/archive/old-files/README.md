# API Gateway

A secure, scalable API gateway service built on Cloudflare Workers, providing both comprehensive API key management and full-fledged gateway capabilities. This service enables creating, validating, and managing API keys with permission scopes and expiration, while also offering advanced gateway features like request routing, proxying with circuit breaker patterns, and API versioning.

## Features

### Core Features
- **Secure Key Generation**: Cryptographically secure API key generation using Web Crypto API
- **Permission Scopes**: Restrict API key access with customizable permission scopes
- **Key Expiration**: Set automatic expiration dates for keys with cleanup
- **Usage Tracking**: Monitor when keys were last used for audit purposes
- **Durable Storage**: Persistent storage of API keys using Cloudflare Durable Objects
- **Rate Limiting**: Protect endpoints from abuse with configurable rate limits
- **IP Extraction**: Secure client IP address extraction for request tracking
- **Auto Cleanup**: Scheduled automatic cleanup of expired keys
- **CORS Support**: Built-in CORS handling for cross-origin requests

### Advanced Features
- **Role-Based Access Control**: Granular admin permissions with predefined roles
- **Admin User Management**: Create and manage admin users with specific permissions
- **Key Rotation**: Rotate keys with configurable grace periods for seamless transitions
- **Cursor-Based Pagination**: Efficient pagination for large datasets
- **Encryption at Rest**: AES-GCM encryption for API keys with versioned support
- **HMAC Verification**: Additional signature verification for enhanced security
- **Comprehensive Audit Logging**: Track all administrative actions with detailed context
- **Security Key Rotation**: Support for rotating encryption and HMAC secrets

### API Gateway Features
- **Enhanced Routing**: Support for regex pattern matching and parameter validation
- **API Versioning**: Configuration-driven API version management 
- **Request Proxying**: Forward requests to upstream services with transformation
- **Path Rewriting**: Transform request paths before forwarding
- **Header Manipulation**: Add, modify, or remove headers for proxied requests
- **Fault Tolerance**: Circuit breaker pattern and retry mechanisms
- **Timeout Management**: Configurable timeouts with request cancellation
- **OpenAPI Configuration**: Schema-validated configuration system with defaults
- **Environment Variable Support**: Flexible configuration through env vars or config files

## Architecture

This service uses Cloudflare Workers with Durable Objects and KV storage for:
- Globally consistent data storage without a separate database
- Low-latency access from any region
- Built-in scalability with Cloudflare's infrastructure
- Automatic background maintenance with Durable Object alarms

```mermaid
flowchart TB
    A["API Request<br>HTTP/HTTPS"] -->|Request| B["Cloudflare Worker<br>Entry Point"]
    B --> C["Auth Middleware<br>Role-Based Access"]
    B --> H["Router<br>Pattern Matching"]
    H --> I["Proxy Service<br>Circuit Breaker"]
    I -->|Forward| J["Upstream<br>Services"]
    C --> D["Key Manager<br>Durable Object"]
    D --> E["Persistent Storage<br>Durable Objects"]
    B <--> F["KV Storage<br>Admin & Audit Data"]
    C --> G["Audit Logger"]
    
    style A fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style B fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style C fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style D fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style E fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style F fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style G fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style H fill:#335577,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style I fill:#335577,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style J fill:#337788,stroke:#88aacc,stroke-width:2px,color:#ffffff
```

### Project Structure

The project follows Clean Architecture principles with distinct layers:

```
api-gateway-workers/
├── src/                           # Source code
│   ├── api/                       # API Layer
│   │   ├── controllers/           # Request handling and responses
│   │   │   ├── BaseController.js  # Base controller with common functionality
│   │   │   ├── KeysController.js  # Key management API
│   │   │   ├── SystemController.js # System operations
│   │   │   └── ValidationController.js # Key validation
│   │   └── middleware/            # HTTP middleware
│   │       ├── authMiddleware.js  # Authentication middleware
│   │       ├── corsMiddleware.js  # CORS support
│   │       ├── errorHandler.js    # Error handling
│   │       └── responseMiddleware.js # Response formatting
│   ├── auth/                      # Legacy Authentication system
│   │   ├── adminManager.js        # Admin user management
│   │   ├── auditLogger.js         # Audit logging
│   │   ├── index.js               # Auth module exports
│   │   ├── keyGenerator.js        # Key generation
│   │   ├── keyValidator.js        # Key validation
│   │   └── roles.js               # Role definitions
│   ├── core/                      # Domain and Application Layers
│   │   ├── audit/                 # Audit functionality
│   │   │   └── AuditLogger.js     # Audit logging service
│   │   ├── auth/                  # Authentication domain
│   │   │   ├── AuthService.js     # Auth service
│   │   │   └── adapters/          # Auth adapters
│   │   ├── command/               # Command pattern implementation
│   │   │   ├── Command.js         # Base command
│   │   │   ├── CommandBus.js      # Command dispatcher
│   │   │   └── CommandHandler.js  # Base handler
│   │   ├── errors/                # Domain errors
│   │   │   └── ApiError.js        # Error classes
│   │   ├── keys/                  # Key management domain
│   │   │   ├── KeyRepository.js   # Repository interface
│   │   │   ├── KeyService.js      # Domain service
│   │   │   ├── adapters/          # Repository adapters
│   │   │   ├── commands/          # Command objects
│   │   │   └── handlers/          # Command handlers
│   │   └── security/              # Security services
│   │       ├── EncryptionService.js # Encryption
│   │       ├── HmacService.js     # HMAC signatures
│   │       ├── KeyGenerator.js    # Secure key generation
│   │       └── RateLimiter.js     # Rate limiting
│   ├── infrastructure/            # Infrastructure Layer
│   │   ├── config/                # Configuration
│   │   │   ├── Config.js          # Config service
│   │   │   └── setupConfig.js     # Config initialization
│   │   ├── di/                    # Dependency Injection
│   │   │   ├── Container.js       # IoC container
│   │   │   └── setupContainer.js  # Service registration
│   │   ├── http/                  # HTTP infrastructure
│   │   │   └── Router.js          # HTTP router
│   │   └── storage/               # Storage implementations
│   │       └── DurableObjectRepository.js # DO storage
│   ├── lib/                       # Integration Layer
│   │   ├── KeyManagerDurableObject.js # Main Durable Object
│   │   └── router.js              # Legacy router
│   ├── models/                    # Legacy business models
│   │   ├── ApiKeyManager.js       # Key management
│   │   └── types.js               # Type definitions
│   ├── utils/                     # Utility functions
│   │   ├── response.js            # HTTP response formatting
│   │   ├── security.js            # Security utilities
│   │   ├── storage.js             # Storage key generation
│   │   └── validation.js          # Input validation
│   └── index.js                   # Entry point
├── test/                          # Test suite
│   ├── utils/                     # Test utilities
│   │   ├── index.js               # Main utilities export
│   │   ├── TestContainer.js       # Test DI container
│   │   ├── factories.js           # Test data factories
│   │   └── mocks/                 # Mock implementations
│   │       ├── storage.js         # Storage mocks
│   │       ├── services.js        # Service mocks
│   │       ├── http.js            # HTTP mocks
│   │       └── cloudflare.js      # Cloudflare mocks
├── docs/                          # Documentation
├── schemas/                        # Schema definitions
│   └── config.schema.json          # Configuration validation schema
├── config.example.json             # Example configuration file
└── wrangler.jsonc                  # Cloudflare Workers configuration
```

## Role-Based Access Control

The service implements role-based access control for administrative operations with predefined roles:

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| SUPER_ADMIN | Full system access | admin:keys:*, admin:users:*, admin:system:* |
| KEY_ADMIN | API key management | admin:keys:create, admin:keys:read, admin:keys:revoke |
| KEY_VIEWER | Read-only key access | admin:keys:read |
| USER_ADMIN | Admin user management | admin:users:create, admin:users:read, admin:users:revoke |
| SUPPORT | Limited support access | admin:keys:read, admin:users:read |
| CUSTOM | Custom permissions | (as specified during creation) |

Key permission scopes:

| Permission Scope | Description |
|------------------|-------------|
| admin:keys:create | Create new API keys |
| admin:keys:read | View API keys |
| admin:keys:update | Update API key properties (including rotation) |
| admin:keys:revoke | Revoke API keys |
| admin:keys:* | Full access to key management |
| admin:users:create | Create new admin users |
| admin:users:read | View admin users |
| admin:users:revoke | Revoke admin user access |
| admin:users:* | Full access to user management |
| admin:system:logs | View system logs |
| admin:system:maintenance | Perform system maintenance |
| admin:system:security | Manage security settings and keys |
| admin:system:* | Full access to system management |

## API Endpoints

### System Setup

```
POST /setup
```
Performs first-time setup of the service, creating the initial super admin.

### API Key Management

```
POST /keys
GET /keys
GET /keys/:id
DELETE /keys/:id
POST /keys/:id/rotate
GET /keys-cursor
```

### Key Validation

```
POST /validate
```

### System Maintenance

```
GET /health
POST /maintenance/cleanup
POST /maintenance/rotate-keys
```

### Audit Logs

```
GET /logs/admin
```

Detailed API documentation is available in the [API Reference](../reference/api-reference.md) file.

## Security Features

### Encryption at Rest

API keys are securely encrypted using AES-GCM encryption:

- 256-bit encryption key derived using PBKDF2
- Unique salt and IV for each key
- Authenticated encryption to prevent tampering
- Version field to support algorithm upgrades
- Support for key rotation without service disruption

### HMAC Signature Verification

All API keys have associated HMAC signatures for additional security:

- SHA-384 HMAC signatures
- Separate storage of signatures and key data
- Validation during key verification
- Support for HMAC secret rotation

### Key Rotation

Two types of key rotation are supported:

1. **API Key Rotation**:
   - Create a new key while keeping the old one valid during a grace period
   - Configurable grace period (default: 30 days)
   - Warning indicators for clients using old keys

2. **Cryptographic Material Rotation**:
   - Rotate the underlying encryption and HMAC secrets
   - Reencrypt all keys with new material
   - Update all HMAC signatures

### Comprehensive Audit Logging

All administrative actions are logged for accountability:

- Who performed the action (admin ID, IP address, user agent)
- What action was performed (with detailed context)
- When the action occurred (timestamp)
- Special handling for security-critical operations

## Deployment

### Prerequisites
- Cloudflare account with Workers enabled
- Node.js and npm installed

### Environment Setup

1. Create KV namespaces for different environments:
   ```bash
   # Create KV namespace for production
   wrangler kv:namespace create "KEYS"
   
   # Create KV namespace for staging
   wrangler kv:namespace create "KEYS" --env staging
   
   # Create KV namespace for development
   wrangler kv:namespace create "KEYS" --env development
   ```

2. Set secret environment variables for production:
   ```bash
   # Generate secure random values for these secrets
   wrangler secret put ENCRYPTION_KEY
   wrangler secret put HMAC_SECRET
   ```

### Configuration System

The API Gateway supports a comprehensive configuration system with multiple options:

#### JSON Configuration File
You can provide a JSON configuration file:

```bash
# Specify configuration file path
CONFIG_PATH=/path/to/config.json npm run dev
```

#### Environment Variables
All configuration options can be set via environment variables with a `CONFIG_` prefix:

```bash
# Set configuration via environment variables
CONFIG_LOGGING_LEVEL=debug CONFIG_SECURITY_API_KEY_HEADER=X-Custom-Key npm run dev
```

Environment variables use underscore notation and are converted to the appropriate nested structure.

#### Configuration System

The API Gateway includes a comprehensive configuration system with:

- **OpenAPI Schema Validation**: All configuration is validated against an OpenAPI schema
- **Environment Detection**: Different validation rules for development and production
- **Multiple Configuration Sources**: 
  - JSON configuration files
  - Environment variables with `CONFIG_` prefix
  - Default values from schema
- **Complex Type Support**: Structured environment variables for complex objects
- **Production Safeguards**: Prevents insecure configurations in production

##### Core Configuration
- `encryption.key`: Secret key for encrypting API keys at rest (required in production)
- `hmac.secret`: Secret for generating HMAC signatures (required in production)

##### Security Configuration
- `security.cors`: CORS settings (origin, methods, headers, etc.)
- `security.apiKeyHeader`: Header name for API key authentication
- `security.headers`: Security headers added to all responses

##### API Configuration
- `routing.versioning`: API version management
- `routing.paramValidation`: Regular expressions for parameter validation
- `routing.priority`: Route matching priority configuration

##### Proxy Configuration
- `proxy.enabled`: Enable/disable proxy functionality
- `proxy.timeout`: Default timeout for proxied requests
- `proxy.retry`: Controls for retrying failed requests
- `proxy.circuitBreaker`: Circuit breaker pattern for fault tolerance
- `proxy.services`: Upstream service configurations

##### Additional Settings
- `logging`: Log levels, stack traces, and request tracking
- `rateLimit`: Request rate limiting with per-endpoint configuration
- `maintenance`: Scheduled tasks and maintenance operations

Example Configuration Files:
- `config.example.json`: General example with all options
- `config.development.example.json`: Development environment settings
- `config.production.example.json`: Production environment settings 

For complete details, see the [Environment Variables Cheatsheet](../reference/env-vars-cheatsheet.md).

### Deployment Steps

1. Set up Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Authenticate with Cloudflare:
   ```bash
   wrangler login
   ```

3. Deploy to Cloudflare:
   ```bash
   npm run deploy
   ```

## Local Development

Start a local development server:
```bash
npm run dev
```

The server will be available at http://localhost:8787.

### First-Time Setup

When you first deploy the service, you need to create the initial super admin:

```bash
curl -X POST http://localhost:8787/setup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "email": "admin@example.com"
  }'
```

Save the returned API key securely - it will only be shown once!

## Testing

This project includes comprehensive unit tests, advanced security tests, and integration tests.

### Test Utilities Package

The project provides a comprehensive test utilities package that simplifies writing tests by providing:

- **TestContainer**: Dependency injection container with pre-configured mocks
- **Mock Factories**: Easy creation of mock objects for services, storage, HTTP, etc.
- **Test Environment Setup**: Utilities for mocking time, crypto, and other environment aspects
- **Test Data Factories**: Generate test data consistently across tests

For more details, see the [test utilities documentation](./test/utils/README.md).

### Unit Tests

Run all unit tests:
```bash
npm test
```

Watch mode for development:
```bash
npm run test:watch
```

Generate test coverage report:
```bash
npm run test:coverage
```

### Integration Tests

Run the integration tests:
```bash
npm run test:integration
```

### Run All Tests

To run both unit and integration tests:
```bash
npm run test:all
```

## Security Considerations

- **One-Time Display**: API keys are only returned once at creation time
- **Secure Storage**: Keys are encrypted at rest using AES-GCM
- **HMAC Verification**: Additional signature verification prevents forgery
- **Permission Scopes**: Keys can be scoped to limit permissions
- **Auto Expiration**: Keys can be set to automatically expire
- **Usage Tracking**: Key usage is tracked for audit purposes
- **Immediate Revocation**: Revoked keys are immediately invalidated
- **Rate Limiting**: Protects against brute force and DoS attacks
- **Input Validation**: Strict validation prevents injection attacks
- **Header Validation**: Secure IP extraction prevents spoofing
- **Concurrent Safety**: Operations are safe under high concurrency
- **Comprehensive Logging**: All admin actions are logged for accountability

## Documentation

Detailed documentation is available in the `docs/` folder:

- [API Reference](../reference/api-reference.md) - Detailed API documentation
- [API Gateway Features](../architecture/api-gateway.md) - API Gateway functionality and implementation
- [Configuration Reference](../reference/configuration-reference.md) - Comprehensive configuration options
- [Environment Variables Cheatsheet](../reference/env-vars-cheatsheet.md) - Quick reference for configuration variables
- [Development Roadmap](../development/roadmap.md) - Future plans for configuration system
- [Architecture Overview](../architecture/overview.md) - System design and component interaction
- [Security Reference](../reference/security-reference.md) - Security features and considerations
- [Quick Start Guide](../guides/quick-start.md) - Get up and running quickly
- [Directory Structure](../architecture/directory-structure.md) - Codebase structure and organization
- [Testing Guide](../development/testing.md) - Instructions for testing
- [Integration Guide](../guides/integration-guide.md) - Integrating with existing systems
- [Improvements](../development/improvements.md) - Summary of recent improvements
- [Contributing Guide](../development/contributing.md) - How to contribute to the project
- [Changelog](./CHANGELOG.md) - Version history and changes

## Future Enhancements

### Short-term
- Web-based admin dashboard for key management
- Enhanced metrics and usage analytics
- Webhook notifications for key events
- Multi-region consistency improvements
- OAuth integration for admin authentication

### API Gateway Roadmap

This project has already implemented Phase 1 of its evolution into a full-fledged API gateway, with plans for further enhancements:

#### Phase 1: Foundation (✅ Implemented)
- ✅ Improved request routing with regex patterns and path variables
- ✅ Enhanced path parameter validation
- ✅ API versioning support
- ✅ Proxy functionality for backend services with fault tolerance

#### Phase 2: Advanced Features (In Progress)
- ⬜ Service discovery and registration system
- ⬜ Load balancing across multiple backend services
- ⬜ Advanced request/response transformation capabilities
- ⬜ Enhanced traffic management (throttling, circuit breaking)

#### Phase 3: Enterprise Capabilities (Planned)
- ⬜ Support for multiple protocols (gRPC, WebSockets)
- ⬜ API composition and aggregation
- ⬜ Performance analytics dashboard
- ⬜ Blue/green and canary deployment capabilities

For detailed documentation on the gateway features, see [API Gateway Features](../architecture/api-gateway.md).
