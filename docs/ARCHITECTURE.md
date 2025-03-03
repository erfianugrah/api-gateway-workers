# Architecture Documentation

This document provides a detailed overview of the API Key Manager's architecture.

## System Architecture

The API Key Manager is built on Cloudflare Workers with Durable Objects, providing a globally distributed, highly available API key management service without a separate database.

```
┌───────────────────┐     ┌──────────────────────┐    ┌──────────────────────┐
│                   │     │                      │    │                      │
│   API Request     │────▶│   Cloudflare Worker  │───▶│  Key Manager         │
│   (HTTP/HTTPS)    │     │   (Entry Point)      │    │  Durable Object      │
│                   │     │                      │    │                      │
└───────────────────┘     └──────────────────────┘    └──────────────┬───────┘
                                                                     │
                                                                     ▼
                                                      ┌──────────────────────┐
                                                      │                      │
                                                      │  Persistent Storage  │
                                                      │  (Durable Objects)   │
                                                      │                      │
                                                      └──────────────────────┘
```

### Key Components

#### 1. Worker Entry Point (`index.js`)

The main Worker script acts as the entry point, handling incoming HTTP requests and routing them to the appropriate Durable Object.

Responsibilities:
- Request routing to Durable Objects
- Global error handling
- CORS configuration and handling
- Durable Object stub creation

#### 2. Key Manager Durable Object (`lib/KeyManagerDurableObject.js`)

The core Durable Object that provides the API key management functionality with persistent state.

Responsibilities:
- Manages internal routing via the Router
- Handles all key management operations
- Provides data persistence via Durable Object storage
- Runs periodic maintenance via Durable Object alarms

#### 3. API Key Manager (`models/ApiKeyManager.js`)

Business logic class that encapsulates API key management operations.

Responsibilities:
- Creates new API keys with secure random values
- Validates API keys and their scopes
- Manages key revocation and expiration
- Handles key lookups and listing
- Cleans up expired keys and stale data

#### 4. Router (`lib/router.js`)

HTTP router for handling API endpoints within the Durable Object.

Responsibilities:
- Routes requests to the appropriate handler
- Extracts path parameters
- Provides middleware support
- Handles method not allowed errors

#### 5. Utility Modules

Several utility modules provide supporting functionality:

- `utils/security.js`: Cryptographic and security functions
- `utils/storage.js`: Storage key generation and consistency
- `utils/response.js`: HTTP response formatting
- `utils/validation.js`: Input validation functions

## API Flow

### Creating an API Key

```
┌────────┐     ┌────────┐     ┌─────────────────┐     ┌─────────────┐     ┌──────────────┐
│        │     │        │     │                 │     │             │     │              │
│ Client │────▶│ Worker │────▶│ Durable Object │────▶│ API Key Mgr │────▶│ Web Crypto   │
│        │     │        │     │                 │     │             │     │              │
└────────┘     └────────┘     └─────────────────┘     └──────┬──────┘     └──────────────┘
                                                            │
                                                            ▼
                                                      ┌──────────────┐
                                                      │              │
                                                      │ Storage      │
                                                      │              │
                                                      └──────────────┘
```

1. Client sends a POST request to `/keys`
2. Worker routes the request to the Key Manager Durable Object
3. Router within the Durable Object directs to the `handleCreateKey` handler
4. Handler validates inputs and calls the ApiKeyManager's `createKey` method
5. ApiKeyManager generates a secure key using Web Crypto API
6. The key and associated metadata are stored in Durable Object storage
7. A lookup entry is created for fast validation
8. The full key details (including the key value) are returned to the client

### Validating an API Key

```
┌────────┐     ┌────────┐     ┌─────────────────┐     ┌─────────────┐     ┌──────────────┐
│        │     │        │     │                 │     │             │     │              │
│ Client │────▶│ Worker │────▶│ Durable Object │────▶│ API Key Mgr │────▶│ Storage      │
│        │     │        │     │                 │     │             │     │ (Lookup)     │
└────────┘     └────────┘     └─────────────────┘     └──────┬──────┘     └──────┬───────┘
                                                            │                    │
                                                            ▼                    ▼
                                                     ┌─────────────┐      ┌─────────────┐
                                                     │ Scope Check │      │ Storage     │
                                                     │             │      │ (Key Data)  │
                                                     └─────────────┘      └─────────────┘
```

1. Client sends a POST request to `/validate` with an API key and optional scopes
2. Worker routes the request to the Key Manager Durable Object
3. Router directs to the `handleValidateKey` handler
4. Handler extracts the API key from the request body or headers
5. ApiKeyManager's `validateKey` method is called
6. The key ID is looked up using the fast lookup index
7. Complete key data is fetched from storage
8. Key status (active/revoked) and expiration are checked
9. If scopes are requested, they are validated against the key's scopes
10. Usage timestamp is updated (non-blocking)
11. Validation result is returned to the client

### Rate Limiting Flow

```
┌────────┐     ┌────────┐     ┌─────────────────┐     ┌─────────────┐     ┌──────────────┐
│        │     │        │     │                 │     │             │     │              │
│ Client │────▶│ Worker │────▶│ Durable Object │────▶│ IP Extract  │────▶│ Rate Limit   │
│        │     │        │     │                 │     │             │     │ Check        │
└────────┘     └────────┘     └─────────────────┘     └─────────────┘     └──────┬───────┘
                                                                                 │
                                       ┌───────────────────────────────────────┐ │
                                       │                                       │ │
                                       │ If Limited: 429 Too Many Requests     │◀┘
                                       │ If Not Limited: Continue Processing   │
                                       │                                       │
                                       └───────────────────────────────────────┘
```

1. Client sends a request to any endpoint
2. The client's IP address is securely extracted and sanitized
3. A rate limit check is performed for the IP+endpoint combination
4. If the client is rate-limited, a 429 response is returned
5. If not rate-limited, the request is processed normally
6. Rate limit headers are included in the response

## Data Model

### API Key Structure

Each API key stored in the system has the following structure:

```javascript
{
  id: "uuid-string",              // Unique identifier (UUID)
  key: "km_hexstring",            // The actual API key value
  name: "My API Key",             // Descriptive name
  owner: "user@example.com",      // Key owner
  scopes: ["read:data"],          // Permission scopes
  status: "active",               // Status (active or revoked)
  createdAt: 1677609600000,       // Creation timestamp (ms)
  expiresAt: 1735689600000,       // Expiration timestamp (ms, 0 = never)
  lastUsedAt: 1677695999000       // Last usage timestamp (ms)
}
```

### Storage Schema

The data is organized in Durable Object storage using the following key patterns:

- `key:{uuid}` - Stores the complete API key record
- `lookup:{api_key_value}` - Maps API key values to their UUIDs for fast validation

This two-level approach provides:
1. Fast key validation via the lookup table
2. Easy key revocation without changing the storage structure
3. Ability to clean up stale lookup entries
4. Storage efficiency by avoiding duplication

## Maintenance and Cleanup

The system uses Durable Object alarms for automatic maintenance:

1. An alarm is set when the Durable Object is created
2. When the alarm fires, expired keys are identified and revoked
3. Stale lookup entries are also cleaned up
4. A new alarm is scheduled for the next cleanup cycle
5. In case of errors, a shorter alarm interval is used

This ensures:
- Expired keys are automatically revoked
- Storage remains clean and efficient
- The system self-maintains without external schedulers

## Security Considerations

See [SECURITY.md](./SECURITY.md) for detailed security implementation information.

## Performance Optimizations

Several optimizations are implemented to ensure high performance:

1. **Lookup Index**: Fast key validation through a lookup index
2. **Non-blocking Updates**: Usage timestamps are updated non-blocking
3. **Pagination**: Key listing supports pagination for large datasets
4. **Caching Headers**: Proper cache headers for cacheable responses
5. **Minimal Storage**: Only essential data is stored, with reasonable limits
6. **Concurrent Safety**: All operations are designed to be safe under concurrency

## Error Handling

The system implements comprehensive error handling:

1. **Global Error Handler**: Catches and formats unexpected errors
2. **Input Validation**: Prevents invalid data from entering the system
3. **Storage Error Recovery**: Handles storage operation failures gracefully
4. **Dependency Checks**: Verifies required resources exist before use
5. **Rate Limiting**: Prevents abuse and DoS attacks