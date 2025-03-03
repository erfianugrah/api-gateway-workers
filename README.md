# API Key Manager

A secure, scalable Cloudflare Workers service for API key management. This service enables creating, validating, and managing API keys with support for permission scopes, key expiration, and usage tracking.

## Features

- **Secure Key Generation**: Cryptographically secure API key generation using Web Crypto API
- **Permission Scopes**: Restrict API key access with customizable permission scopes
- **Key Expiration**: Set automatic expiration dates for keys with cleanup
- **Usage Tracking**: Monitor when keys were last used for audit purposes
- **Durable Storage**: Persistent storage of API keys using Cloudflare Durable Objects
- **Rate Limiting**: Protect endpoints from abuse with configurable rate limits
- **IP Extraction**: Secure client IP address extraction for request tracking
- **Batch Operations**: Efficient management of multiple keys
- **Auto Cleanup**: Scheduled automatic cleanup of expired keys
- **CORS Support**: Built-in CORS handling for cross-origin requests

## Architecture

This service uses Cloudflare Workers with Durable Objects for:
- Globally consistent data storage without a separate database
- Low-latency access from any region
- Built-in scalability with Cloudflare's infrastructure
- Automatic background maintenance with Durable Object alarms

### Project Structure

```
key-manager-workers/
├── src/                  # Source code
│   ├── handlers/         # API route handlers
│   ├── lib/              # Core functionality
│   ├── models/           # Business logic and data models
│   ├── utils/            # Utility functions
│   └── index.js          # Entry point
├── test/                 # Test suite
│   ├── lib/              # Core functionality tests
│   ├── models/           # Business logic tests
│   ├── utils/            # Utility tests
│   └── integration-test.sh # Integration tests
└── wrangler.jsonc        # Cloudflare Workers configuration
```

## API Endpoints

### Create API Key
- **POST** `/keys`
- **Body**:
  ```json
  {
    "name": "My API Key",
    "owner": "user@example.com",
    "scopes": ["read:users", "write:posts"],
    "expiresAt": 1735689600000 // Optional, timestamp in milliseconds
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "id": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
    "name": "My API Key",
    "owner": "user@example.com",
    "scopes": ["read:users", "write:posts"],
    "status": "active",
    "createdAt": 1677609600000,
    "expiresAt": 1735689600000,
    "lastUsedAt": 0,
    "key": "a95c530a7af5f492a74499e70578d150..." // Only returned at creation
  }
  ```

### List API Keys
- **GET** `/keys`
- **Response** (200 OK):
  ```json
  [
    {
      "id": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
      "name": "My API Key",
      "owner": "user@example.com",
      "scopes": ["read:users", "write:posts"],
      "status": "active",
      "createdAt": 1677609600000,
      "expiresAt": 1735689600000,
      "lastUsedAt": 1677695999000
    }
  ]
  ```

### Get API Key Details
- **GET** `/keys/:id`
- **Response** (200 OK):
  ```json
  {
    "id": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
    "name": "My API Key",
    "owner": "user@example.com",
    "scopes": ["read:users", "write:posts"],
    "status": "active",
    "createdAt": 1677609600000,
    "expiresAt": 1735689600000,
    "lastUsedAt": 1677695999000
  }
  ```

### Revoke API Key
- **DELETE** `/keys/:id`
- **Response** (200 OK):
  ```json
  {
    "message": "API key revoked successfully"
  }
  ```

### Validate API Key
- **POST** `/validate`
- **Body**:
  ```json
  {
    "key": "a95c530a7af5f492a74499e70578d150...",
    "scopes": ["read:users"] // Optional, scopes to check
  }
  ```
- **Response** (200 OK - Valid):
  ```json
  {
    "valid": true,
    "owner": "user@example.com",
    "scopes": ["read:users", "write:posts"]
  }
  ```
- **Response** (200 OK - Invalid):
  ```json
  {
    "valid": false,
    "error": "API key does not have the required scopes",
    "requiredScopes": ["admin:system"],
    "providedScopes": ["read:users", "write:posts"]
  }
  ```

## Error Handling

All API endpoints return appropriate error responses with meaningful messages:

- **400 Bad Request**: Missing required fields or invalid input
- **404 Not Found**: API key not found
- **429 Too Many Requests**: Rate limit exceeded
- **405 Method Not Allowed**: Invalid HTTP method
- **500 Internal Server Error**: Unexpected server errors

## Deployment

### Prerequisites
- Cloudflare account with Workers enabled
- Node.js and npm installed

### Steps

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

## Testing

This project includes comprehensive unit tests, advanced security tests, and integration tests.

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

### Advanced Security Tests

The advanced security test suite validates:
- Cryptographic key generation strength
- Rate limiting robustness and isolation
- IP extraction security and header validation
- Key expiration and revocation mechanisms
- Concurrent operation safety
- Input validation and sanitization

### Integration Tests

Run the integration tests (requires curl):
```bash
npm run test:integration
```

This will:
1. Start a local development server
2. Create test API keys with different configurations
3. Test listing, filtering, and pagination
4. Validate keys with different scopes
5. Test key revocation and expiration
6. Test edge cases like invalid keys and rate limiting
7. Verify error handling

### Run All Tests

To run both unit and integration tests:
```bash
npm run test:all
```

## Security Considerations

- **One-Time Display**: API keys are only returned once at creation time
- **Secure Storage**: No plaintext keys are stored or logged
- **Permission Scopes**: Keys can be scoped to limit permissions
- **Auto Expiration**: Keys can be set to automatically expire and get cleaned up
- **Usage Tracking**: Key usage is tracked for audit purposes
- **Immediate Revocation**: Revoked keys are immediately invalidated
- **Rate Limiting**: Protects against brute force and DoS attacks
- **Input Validation**: Strict validation prevents injection attacks
- **Header Validation**: Secure IP extraction prevents spoofing
- **Concurrent Safety**: Operations are safe under high concurrency

## Component Documentation

### Key Components

- **KeyManagerDurableObject**: Core Durable Object for persistent data storage and automated maintenance
- **ApiKeyManager**: Key management operations (creation, validation, revocation)
- **Router**: HTTP request routing and middleware handling
- **Security Utils**: Cryptographic functions, rate limiting, and IP extraction
- **Storage Utils**: Consistent key generation for storage operations
- **Response Utils**: Standardized HTTP response formatting

### How Key Expiration Works

1. Keys can be created with an optional `expiresAt` timestamp
2. During validation, expired keys are detected and auto-revoked
3. The KeyManagerDurableObject runs scheduled cleanups via alarms
4. Expired keys are marked as revoked during cleanup runs
5. Stale lookup entries are removed to prevent data inconsistency

### Rate Limiting Implementation

Rate limiting is implemented with:
- Per-client and per-endpoint isolation
- Configurable limits and time windows
- Fast, consistent storage using Durable Objects
- Proper header handling (Retry-After, X-RateLimit-*)

## Future Enhancements

- Webhook notifications for key events (creation, revocation, etc.)
- Enhanced audit logging for security monitoring
- Key rotation mechanism for replacing keys without downtime
- Multi-region consistency improvements
- Enhanced metrics and usage analytics
- Administrative dashboard for key management

## Documentation

Detailed documentation is available in the `docs/` folder:

- [Quick Start Guide](./docs/QUICKSTART.md) - Get up and running quickly
- [API Reference](./docs/API.md) - Detailed API documentation
- [Architecture](./docs/ARCHITECTURE.md) - System design and component interaction
- [Security Implementation](./docs/SECURITY.md) - Security features and considerations
- [Code Organization](./docs/ORGANIZATION.md) - Codebase structure and organization
- [Improvements](./docs/IMPROVEMENTS.md) - Summary of recent improvements
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to the project
- [Changelog](./CHANGELOG.md) - Version history and changes