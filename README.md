# API Key Manager

A secure, scalable Cloudflare Workers service for API key management. This service enables creating, validating, and managing API keys with support for permission scopes, key expiration, and usage tracking.

## Features

- **Secure Key Generation**: Cryptographically secure API key generation
- **Permission Scopes**: Restrict API key access with customizable permission scopes
- **Key Expiration**: Set automatic expiration dates for keys
- **Usage Tracking**: Monitor when keys were last used
- **Durable Storage**: Persistent storage of API keys using Cloudflare Durable Objects
- **CORS Support**: Built-in CORS handling for cross-origin requests

## Architecture

This service uses Cloudflare Workers with Durable Objects for:
- Globally consistent data storage without a separate database
- Low-latency access from any region
- Built-in scalability with Cloudflare's infrastructure

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

This project includes both unit tests and integration tests.

### Unit Tests

Run the unit tests:
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

Run the integration tests (requires curl):
```bash
npm run test:integration
```

This will:
1. Start a local development server
2. Create a test API key
3. Test listing, getting, validating, and revoking the key
4. Validate various error conditions

### Run All Tests

To run both unit and integration tests:
```bash
npm run test:all
```

## Security Considerations

- API keys are only returned once at creation time
- No plaintext keys are stored or logged
- Keys can be scoped to limit permissions
- Keys can be set to automatically expire
- Key usage is tracked for audit purposes
- Revoked keys are immediately invalidated

## Future Enhancements

- Rate limiting for API endpoints
- Pagination for listing large numbers of keys
- Webhook notifications for key events (creation, revocation, etc.)
- Audit logging for security monitoring
- Batch operations for managing multiple keys
- Key rotation mechanism for replacing keys without downtime