# API Key Manager API Documentation

## Base URL

When deployed, the base URL will be provided by Cloudflare. For local development, the base URL is:

```
http://localhost:8787
```

## Authentication

The API Key Manager now includes role-based authentication for administrative operations. Most endpoints require an API key with appropriate admin permissions.

To authenticate requests:

```
X-Api-Key: km_your_api_key_here
```

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
  "version": "1.0.0",
  "timestamp": 1677609600000
}
```

### First-Time Setup

```
POST /setup
```

Performs first-time setup of the service, creating the initial super admin. This endpoint can only be called once.

**Request Body**:
```json
{
  "name": "Super Admin",
  "email": "admin@example.com"
}
```

**Response Example (201 Created)**:
```json
{
  "message": "Initial setup completed successfully",
  "id": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
  "key": "km_a95c530a7af5f492a74499e70578d150...",
  "name": "Super Admin (Super Admin)",
  "email": "admin@example.com",
  "role": "SUPER_ADMIN",
  "note": "IMPORTANT: Save this API key securely. It will never be shown again."
}
```

### Create API Key

```
POST /keys
```

Creates a new API key.

**Authentication**: Requires `admin:keys:create` permission

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

**Authentication**: Requires `admin:keys:read` permission

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

### Cursor-Based Pagination for API Keys

```
GET /keys-cursor
```

Lists API keys using cursor-based pagination for better performance with large datasets.

**Authentication**: Requires `admin:keys:read` permission

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Maximum number of keys to return (default: 100, max: 1000) |
| cursor | string | No | Cursor for pagination from previous response |
| includeRotated | boolean | No | Whether to include rotated keys (default: false) |

**Response Headers**:

| Header | Description |
|--------|-------------|
| X-Pagination-Limit | Number of keys requested |
| X-Has-More | Whether more results exist |
| X-Next-Cursor | Cursor for the next page (if available) |

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
  }
]
```

### Get API Key Details

```
GET /keys/:id
```

Gets details for a specific API key.

**Authentication**: Requires `admin:keys:read` permission

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

**Authentication**: Requires `admin:keys:revoke` permission

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | API key ID (UUID) |

**Request Body (Optional)**:
```json
{
  "reason": "No longer needed"
}
```

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

### Rotate API Key

```
POST /keys/:id/rotate
```

Rotates an API key by creating a new key and marking the old one as rotated. The old key continues to work during the specified grace period.

**Authentication**: Requires `admin:keys:update` permission

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | API key ID (UUID) |

**Request Body**:
```json
{
  "gracePeriodDays": 30,
  "name": "Rotated Key Name",
  "scopes": ["read:users", "write:posts"],
  "expiresAt": 1735689600000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| gracePeriodDays | number | No | Number of days the old key remains valid (default: 30, max: 90) |
| name | string | No | New name for the rotated key |
| scopes | string[] | No | New scopes for the rotated key |
| expiresAt | number | No | New expiration timestamp for the rotated key |

**Response Example (200 OK)**:
```json
{
  "success": true,
  "message": "API key rotated successfully",
  "originalKey": {
    "id": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
    "name": "My API Key",
    "status": "rotated",
    "rotatedAt": 1677609600000,
    "gracePeriodEnds": 1680288000000
  },
  "newKey": {
    "id": "f9e7d6c5-b4a3-2d1c-e0f9-8b7a6c5d4e3f",
    "key": "km_new_key_value_here",
    "name": "Rotated Key Name",
    "status": "active",
    "createdAt": 1677609600000
  }
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

**Response Example (Rotated Key, 200 OK)**:
```json
{
  "valid": true,
  "owner": "user@example.com",
  "scopes": ["read:users", "write:posts"],
  "keyId": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
  "warning": "This API key has been rotated. Please switch to the new key before 2023-01-15T00:00:00.000Z",
  "rotatedToId": "f9e7d6c5-b4a3-2d1c-e0f9-8b7a6c5d4e3f",
  "gracePeriodEnds": 1673740800000
}
```

### Maintenance: Clean Up Expired Keys

```
POST /maintenance/cleanup
```

Admin endpoint to manually trigger cleanup of expired keys.

**Authentication**: Requires `admin:system:maintenance` permission

**Response Example (200 OK)**:
```json
{
  "revokedCount": 5,
  "staleCount": 2,
  "rotationCount": 3,
  "timestamp": 1677695999000
}
```

### Maintenance: Rotate Encryption Keys

```
POST /maintenance/rotate-keys
```

High-security endpoint to rotate the encryption and HMAC material used to secure API keys.

**Authentication**: Requires `admin:system:security` permission

**Request Body**:
```json
{
  "oldSecret": "current-encryption-key",
  "newSecret": "new-encryption-key"
}
```

**Response Example (200 OK)**:
```json
{
  "success": true,
  "message": "Encryption and HMAC keys rotated successfully",
  "encryptionCount": 247,
  "hmacCount": 247,
  "timestamp": 1677695999000
}
```

### Admin Logs

```
GET /logs/admin
```

View audit logs of admin actions.

**Authentication**: Requires `admin:system:logs` permission

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Maximum number of logs to return (default: 50) |
| cursor | string | No | Cursor for pagination |
| action | string | No | Filter logs by action type |
| adminId | string | No | Filter logs by admin ID |

**Response Example (200 OK)**:
```json
{
  "logs": [
    {
      "id": "log-uuid-1",
      "timestamp": 1677609600000,
      "adminId": "admin-uuid-1",
      "action": "create_key",
      "details": {
        "keyId": "key-uuid-1",
        "name": "New API Key"
      },
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "cursor": "next-page-cursor",
  "hasMore": true
}
```

## Admin Roles and Permissions

The API Key Manager implements role-based access control with the following predefined roles:

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

### 401 Unauthorized

Returned when no API key is provided or the key is invalid.

```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden

Returned when the API key does not have the required permissions.

```json
{
  "error": "You do not have permission to create API keys"
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
