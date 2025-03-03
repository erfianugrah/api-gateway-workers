# API Key Manager API Documentation

## Base URL

When deployed, the base URL will be provided by Cloudflare. For local development, the base URL is:

```
http://localhost:8787
```

## Authentication

This service does not have built-in authentication. You should protect it with Cloudflare Access or a similar service in production.

## Endpoints

### Health Check

```
GET /health
```

Returns the health status of the service.

**Response Example (200 OK)**:
```json
{
  "status": "healthy",
  "timestamp": 1677609600000
}
```

### Create API Key

```
POST /keys
```

Creates a new API key.

**Request Body**:
```json
{
  "name": "My API Key",
  "owner": "user@example.com",
  "scopes": ["read:users", "write:posts"],
  "expiresAt": 1735689600000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | A descriptive name for the API key |
| owner | string | Yes | The owner or user of this API key |
| scopes | string[] | Yes | Array of permission scopes |
| expiresAt | number | No | Timestamp (ms) when key expires |

**Response Example (201 Created)**:
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
  "key": "km_a95c530a7af5f492a74499e70578d150..."
}
```

**Note**: The `key` value is only returned at creation time and cannot be retrieved later.

### List API Keys

```
GET /keys
```

Lists all API keys.

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Maximum number of keys to return (default: 100, max: 1000) |
| offset | number | No | Number of keys to skip (for pagination) |

**Response Headers**:

| Header | Description |
|--------|-------------|
| X-Total-Count | Total number of keys |

**Response Example (200 OK)**:
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
  },
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "name": "Another API Key",
    "owner": "admin@example.com",
    "scopes": ["admin:system"],
    "status": "active",
    "createdAt": 1677609600000,
    "expiresAt": 0,
    "lastUsedAt": 1677695999000
  }
]
```

### Get API Key Details

```
GET /keys/:id
```

Gets details for a specific API key.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | API key ID (UUID) |

**Response Example (200 OK)**:
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

```
DELETE /keys/:id
```

Revokes (deactivates) an API key.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | API key ID (UUID) |

**Response Example (200 OK)**:
```json
{
  "success": true,
  "message": "API key revoked successfully",
  "id": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
  "name": "My API Key",
  "revokedAt": 1677695999000
}
```

### Validate API Key

```
POST /validate
```

Validates an API key and optionally checks if it has required scopes.

**Request Body**:
```json
{
  "key": "km_a95c530a7af5f492a74499e70578d150...",
  "scopes": ["read:users"]
}
```

**Alternative**: You can also provide the API key in the `X-API-Key` header.

**Response Example (Valid Key, 200 OK)**:
```json
{
  "valid": true,
  "owner": "user@example.com",
  "scopes": ["read:users", "write:posts"],
  "keyId": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94"
}
```

**Response Example (Invalid Key, 200 OK)**:
```json
{
  "valid": false,
  "error": "API key does not have the required scopes",
  "requiredScopes": ["admin:system"],
  "providedScopes": ["read:users", "write:posts"]
}
```

**Response Example (Revoked Key, 200 OK)**:
```json
{
  "valid": false,
  "error": "API key is revoked"
}
```

**Response Example (Expired Key, 200 OK)**:
```json
{
  "valid": false,
  "error": "API key has expired"
}
```

### Maintenance: Clean Up Expired Keys

```
POST /maintenance/cleanup
```

Admin endpoint to manually trigger cleanup of expired keys.

**Response Example (200 OK)**:
```json
{
  "revokedCount": 5,
  "staleCount": 2,
  "timestamp": 1677695999000
}
```

## Error Responses

### 400 Bad Request

Returned when the request is invalid or missing required fields.

```json
{
  "error": "Missing required fields",
  "details": {
    "name": "Name is required",
    "owner": "Owner is required"
  }
}
```

### 404 Not Found

Returned when the requested resource is not found.

```json
{
  "error": "API key not found"
}
```

### 429 Too Many Requests

Returned when rate limits are exceeded.

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

Headers:
- `Retry-After`: Seconds to wait before retrying
- `X-RateLimit-Limit`: Rate limit ceiling
- `X-RateLimit-Remaining`: Number of requests left
- `X-RateLimit-Reset`: Timestamp when the rate limit will reset

### 405 Method Not Allowed

Returned when an unsupported HTTP method is used.

```json
{
  "error": "Method not allowed"
}
```

### 500 Internal Server Error

Returned when an unexpected error occurs.

```json
{
  "error": "Internal server error"
}
```