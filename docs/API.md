# API Reference Documentation

This document provides a comprehensive reference for all API endpoints provided by the API Gateway. It includes request/response formats, authentication requirements, error codes, and usage examples.

## API Overview

```mermaid
graph TB
    Client(["Client Application"])
    API["API Gateway"]
    Keys["Key Management"]
    Validation["Key Validation"]
    System["System Operations"]
    Proxy["API Proxy"]
    
    Client -->|"X-API-Key"| API
    API --> Keys
    API --> Validation
    API --> System
    API --> Proxy
    
    subgraph "Key Management"
        K1["Create Key"]
        K2["Get Key"]
        K3["List Keys"]
        K4["Revoke Key"]
        K5["Rotate Key"]
    end
    
    subgraph "Validation"
        V1["Validate Key"]
    end
    
    subgraph "System Operations"
        S1["Setup"]
        S2["Status"]
        S3["Configuration"]
    end
    
    subgraph "Proxy Services"
        P1["Route Requests"]
        P2["Transform Responses"]
        P3["Circuit Breaking"]
    end
    
    style Client fill:#f9f,stroke:#333,stroke-width:2px
    style API fill:#bbf,stroke:#333,stroke-width:2px
    style Keys fill:#dfd,stroke:#333,stroke-width:1px
    style Validation fill:#dfd,stroke:#333,stroke-width:1px
    style System fill:#dfd,stroke:#333,stroke-width:1px
    style Proxy fill:#dfd,stroke:#333,stroke-width:1px
```

## API Architecture

```mermaid
flowchart TD
    subgraph Client
        A[Client Application]
    end
    
    subgraph API_Gateway["API Gateway"]
        B[Request Handling]
        C[Authentication Middleware]
        D[Rate Limiting]
        E[CORS/Security]
        F[Routing]
        
        B --> C
        C --> D
        D --> E
        E --> F
        
        subgraph "Handlers"
            G[Key Management]
            H[Validation]
            I[System]
            J[Proxy]
        end
        
        F --> G
        F --> H
        F --> I
        F --> J
    end
    
    subgraph Backend
        K[KeyManager]
        L[Authentication]
        M[Storage]
        N[Upstream Services]
    end
    
    A -->|HTTP Request| B
    G --> K
    H --> L
    I --> M
    J --> N
    
    style Client fill:#f9f,stroke:#333,stroke-width:2px
    style API_Gateway fill:#bbf,stroke:#333,stroke-width:2px
    style Backend fill:#dfd,stroke:#333,stroke-width:1px
```

## Table of Contents

- [Authentication](#authentication)
- [API Key Management](#api-key-management)
  - [Create Key](#create-key)
  - [Get Key](#get-key)
  - [List Keys](#list-keys)
  - [Revoke Key](#revoke-key)
  - [Rotate Key](#rotate-key)
- [Key Validation](#key-validation)
  - [Validate Key](#validate-key)
- [System Operations](#system-operations)
  - [First-Time Setup](#first-time-setup)
  - [System Status](#system-status)
  - [System Configuration](#system-configuration)
- [API Gateway Features](#api-gateway-features)
  - [Proxy Request](#proxy-request)
- [Errors](#errors)
  - [Error Codes](#error-codes)
  - [Error Response Format](#error-response-format)
- [Webhooks](#webhooks)
- [Rate Limiting](#rate-limiting)

## Authentication

The API Gateway uses API key authentication for all endpoints. Administrative endpoints require an admin API key with appropriate permissions.

```mermaid
sequenceDiagram
    participant Client as Client
    participant Gateway as API Gateway
    participant KeyManager as Key Manager
    
    Client->>Gateway: Request with X-API-Key header
    Gateway->>KeyManager: Validate API Key
    KeyManager->>Gateway: Key Validation Result
    
    alt Valid Key with Sufficient Permissions
        Gateway->>Client: 200 OK with Resource
    else Invalid Key
        Gateway->>Client: 401 Unauthorized
    else Insufficient Permissions
        Gateway->>Client: 403 Forbidden
    end
```

### Headers

```
X-API-Key: km_your_api_key_here
```

### Admin Permissions

Admin API keys include scopes that define their permissions:

```mermaid
graph TD
    Admin["Admin API Key"]
    
    subgraph "Key Management"
        KC[admin:keys:create]
        KR[admin:keys:read]
        KRev[admin:keys:revoke]
        KRot[admin:keys:rotate]
    end
    
    subgraph "User Management"
        UC[admin:users:create]
        UR[admin:users:read]
        URev[admin:users:revoke]
    end
    
    subgraph "System"
        SS[admin:system:security]
        SC[admin:system:config]
    end
    
    Admin --> KC
    Admin --> KR
    Admin --> KRev
    Admin --> KRot
    Admin --> UC
    Admin --> UR
    Admin --> URev
    Admin --> SS
    Admin --> SC
    
    style Admin fill:#f9f,stroke:#333,stroke-width:2px
```

| Permission | Description |
|------------|-------------|
| `admin:keys:create` | Ability to create API keys |
| `admin:keys:read` | Ability to view API keys |
| `admin:keys:revoke` | Ability to revoke API keys |
| `admin:keys:rotate` | Ability to rotate API keys |
| `admin:users:create` | Ability to create admin users |
| `admin:users:read` | Ability to view admin users |
| `admin:users:revoke` | Ability to revoke admin access |
| `admin:system:security` | Ability to perform security operations |
| `admin:system:config` | Ability to view system configuration |

For complete details on role-based access control, see [SECURITY.md](./SECURITY.md).

## API Key Management

```mermaid
classDiagram
    class ApiKey {
        +String id
        +String key
        +String name
        +String owner
        +String[] scopes
        +String status
        +Number createdAt
        +Number expiresAt
        +Number lastUsedAt
        +Object metadata
    }
    
    class KeyStatus {
        <<enumeration>>
        ACTIVE
        REVOKED
        ROTATED
    }
    
    ApiKey --> KeyStatus
```

### Create Key

Creates a new API key with the specified properties.

```mermaid
sequenceDiagram
    participant Client as Client
    participant Gateway as API Gateway
    participant Handler as CreateKeyHandler
    participant Storage as KeyRepository
    
    Client->>Gateway: POST /keys (with admin key)
    Gateway->>Handler: Handle Create Key Request
    Handler->>Storage: Create and Store Key
    Storage-->>Handler: Return New Key
    Handler-->>Gateway: Return Key Info
    Gateway-->>Client: 201 Created (with key)
```

```
POST /keys
```

#### Authentication

Requires an admin API key with the `admin:keys:create` permission.

#### Request Body

```json
{
  "name": "My Application Key",
  "owner": "application-name",
  "scopes": ["read:data", "write:data"],
  "expiresAt": 1674259200000,
  "metadata": {
    "environment": "production",
    "team": "backend"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Descriptive name for the key |
| `owner` | string | Yes | Owner of the key (user, service, etc.) |
| `scopes` | array | Yes | Array of permission scopes |
| `expiresAt` | number | No | Expiration timestamp in milliseconds (0 = never expires) |
| `metadata` | object | No | Custom metadata for the key |

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "key": "km_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "name": "My Application Key",
  "owner": "application-name",
  "scopes": ["read:data", "write:data"],
  "status": "active",
  "createdAt": 1642723200000,
  "expiresAt": 1674259200000,
  "lastUsedAt": 0,
  "metadata": {
    "environment": "production",
    "team": "backend"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID (UUID) for the key |
| `key` | string | The API key value (only shown on creation) |
| `name` | string | Descriptive name |
| `owner` | string | Key owner |
| `scopes` | array | Array of permission scopes |
| `status` | string | Key status (`active`, `revoked`, or `rotated`) |
| `createdAt` | number | Creation timestamp in milliseconds |
| `expiresAt` | number | Expiration timestamp (0 = never expires) |
| `lastUsedAt` | number | Last usage timestamp (0 = never used) |
| `metadata` | object | Custom metadata |

#### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 403 | `FORBIDDEN` | Insufficient permissions |

#### Example

```bash
curl -X POST https://api.example.com/keys \
  -H "X-API-Key: km_your_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Application Key",
    "owner": "application-name",
    "scopes": ["read:data", "write:data"]
  }'
```

### Get Key

Retrieves information about a specific API key by ID.

```mermaid
sequenceDiagram
    participant Client as Client
    participant Gateway as API Gateway
    participant Handler as GetKeyHandler
    participant Storage as KeyRepository
    
    Client->>Gateway: GET /keys/:id (with admin key)
    Gateway->>Handler: Handle Get Key Request
    Handler->>Storage: Fetch Key by ID
    Storage-->>Handler: Return Key Info
    Handler-->>Gateway: Return Key Info (without actual key)
    Gateway-->>Client: 200 OK (key info)
```

```
GET /keys/:id
```

#### Authentication

Requires an admin API key with the `admin:keys:read` permission.

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `:id` | The UUID of the API key |

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Application Key",
  "owner": "application-name",
  "scopes": ["read:data", "write:data"],
  "status": "active",
  "createdAt": 1642723200000,
  "expiresAt": 1674259200000,
  "lastUsedAt": 1642780000000,
  "metadata": {
    "environment": "production",
    "team": "backend"
  }
}
```

Note: The actual API key value is not included in the response for security reasons.

#### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | API key not found |

#### Example

```bash
curl https://api.example.com/keys/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-Key: km_your_admin_key"
```

### List Keys

Retrieves a paginated list of API keys.

```mermaid
flowchart TD
    A[Client Request] --> B{Pagination Type}
    B -->|Offset| C[Offset-Based Pagination]
    B -->|Cursor| D[Cursor-Based Pagination]
    
    C --> E[Fetch Keys with Offset and Limit]
    D --> F[Fetch Keys with Cursor and Limit]
    
    E --> G[Return Keys with Total Count]
    F --> H[Return Keys with Next Cursor]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
```

```
GET /keys
```

#### Authentication

Requires an admin API key with the `admin:keys:read` permission.

#### Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `limit` | 100 | Number of keys to return (max 1000) |
| `offset` | 0 | Offset for pagination |
| `cursor` | - | Cursor for cursor-based pagination (alternative to offset) |
| `status` | - | Filter by status (`active`, `revoked`, `rotated`) |
| `owner` | - | Filter by owner |

#### Response (Offset Pagination)

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Application Key",
      "owner": "application-name",
      "scopes": ["read:data", "write:data"],
      "status": "active",
      "createdAt": 1642723200000,
      "expiresAt": 1674259200000,
      "lastUsedAt": 1642780000000,
      "metadata": {
        "environment": "production",
        "team": "backend"
      }
    },
    // More keys...
  ],
  "totalItems": 42,
  "limit": 10,
  "offset": 0
}
```

#### Response (Cursor Pagination)

```json
{
  "items": [
    // API keys...
  ],
  "limit": 10,
  "hasMore": true,
  "nextCursor": "eyJpZCI6ImFiY2RlZjEyMzQiLCJ0cyI6MTY0MjcyMzIwMDAwMH0="
}
```

#### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid pagination parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 403 | `FORBIDDEN` | Insufficient permissions |

#### Example

```bash
curl "https://api.example.com/keys?limit=10&status=active" \
  -H "X-API-Key: km_your_admin_key"
```

### Revoke Key

Revokes an API key by ID.

```mermaid
stateDiagram-v2
    [*] --> Active
    Active --> Revoked: Revoke Key
    Revoked --> [*]

    state Active {
        [*] --> InUse
        InUse --> [*]
    }

    state Revoked {
        [*] --> Invalidated
        Invalidated --> [*]
    }
```

```
DELETE /keys/:id
```

#### Authentication

Requires an admin API key with the `admin:keys:revoke` permission.

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `:id` | The UUID of the API key to revoke |

#### Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `reason` | - | Reason for revocation (optional) |

#### Response

```json
{
  "success": true,
  "message": "API key revoked successfully",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Application Key",
  "revokedAt": 1642780000000
}
```

#### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | API key not found |

#### Example

```bash
curl -X DELETE "https://api.example.com/keys/550e8400-e29b-41d4-a716-446655440000?reason=Security%20breach" \
  -H "X-API-Key: km_your_admin_key"
```

### Rotate Key

Rotates an API key with a grace period.

```mermaid
sequenceDiagram
    participant Client as Client
    participant API as API Gateway
    participant Handler as RotateKeyHandler
    participant Storage as Key Storage
    
    Client->>API: POST /keys/:id/rotate
    API->>Handler: Execute Command
    Handler->>Storage: Get Original Key
    Storage-->>Handler: Return Original Key
    Handler->>Storage: Create New Key
    Storage-->>Handler: Return New Key
    Handler->>Storage: Update Original Key (status=rotated)
    Handler-->>API: Return Both Keys
    API-->>Client: 200 OK (with both keys info)
    
    Note over Client,Storage: Original key continues to work during grace period
```

```
POST /keys/:id/rotate
```

#### Authentication

Requires an admin API key with the `admin:keys:rotate` permission.

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `:id` | The UUID of the API key to rotate |

#### Request Body

```json
{
  "gracePeriodDays": 30,
  "scopes": ["read:data", "write:data"],
  "name": "Updated Key Name",
  "expiresAt": 1704931200000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gracePeriodDays` | number | No | Grace period in days (1-90) |
| `scopes` | array | No | Updated scopes (if not provided, keeps existing) |
| `name` | string | No | Updated name (if not provided, keeps existing) |
| `expiresAt` | number | No | Updated expiration timestamp |

#### Response

```json
{
  "success": true,
  "message": "API key rotated successfully",
  "originalKey": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Application Key",
    "status": "rotated",
    "rotatedAt": 1642780000000,
    "rotatedToId": "661f9511-f30c-52e5-b827-557766551111"
  },
  "newKey": {
    "id": "661f9511-f30c-52e5-b827-557766551111",
    "key": "km_fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
    "name": "Updated Key Name",
    "scopes": ["read:data", "write:data"],
    "status": "active",
    "createdAt": 1642780000000,
    "expiresAt": 1704931200000,
    "rotatedFromId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "gracePeriodDays": 30,
  "gracePeriodEnds": 1645372000000
}
```

#### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | API key not found |

#### Example

```bash
curl -X POST https://api.example.com/keys/550e8400-e29b-41d4-a716-446655440000/rotate \
  -H "X-API-Key: km_your_admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "gracePeriodDays": 30,
    "name": "Updated Key Name"
  }'
```

## Key Validation

### Validate Key

Validates an API key against required scopes.

```mermaid
flowchart TD
    A[Validate Key Request] --> B{Key Format Valid?}
    B -->|No| C[Return Invalid]
    B -->|Yes| D{Key Exists?}
    D -->|No| C
    D -->|Yes| E{Key Status Active?}
    E -->|No| F{Key Rotated?}
    F -->|No| C
    F -->|Yes| G{Within Grace Period?}
    G -->|No| C
    G -->|Yes| H{Check Scopes}
    E -->|Yes| H
    H -->|Has Required Scopes| I[Return Valid]
    H -->|Missing Scopes| C
    
    I -->|If Rotated| J[Include Rotation Warning]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style E fill:#bbf,stroke:#333,stroke-width:2px
    style F fill:#bbf,stroke:#333,stroke-width:2px
    style H fill:#bbf,stroke:#333,stroke-width:2px
```

```
POST /validate
```

#### Request Body

```json
{
  "apiKey": "km_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "requiredScopes": ["read:data"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | Yes | API key to validate |
| `requiredScopes` | array | No | Scopes to check for (empty = no scope check) |

#### Response (Valid Key)

```json
{
  "valid": true,
  "keyId": "550e8400-e29b-41d4-a716-446655440000",
  "scopes": ["read:data", "write:data"],
  "owner": "application-name",
  "metadata": {
    "environment": "production",
    "team": "backend"
  }
}
```

#### Response (Invalid Key)

```json
{
  "valid": false,
  "error": "API key is revoked"
}
```

#### Response (Valid but Rotated Key)

```json
{
  "valid": true,
  "keyId": "550e8400-e29b-41d4-a716-446655440000",
  "scopes": ["read:data", "write:data"],
  "owner": "application-name",
  "metadata": {
    "environment": "production",
    "team": "backend"
  },
  "rotationWarning": {
    "message": "This API key has been rotated. Please update to the new key.",
    "gracePeriodEnds": 1645372000000,
    "newKeyId": "661f9511-f30c-52e5-b827-557766551111"
  }
}
```

#### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Invalid API key |
| 403 | `FORBIDDEN` | Missing required scopes |

#### Example

```bash
curl -X POST https://api.example.com/validate \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "km_your_api_key",
    "requiredScopes": ["read:data"]
  }'
```

## System Operations

### First-Time Setup

Initializes the system with the first admin user.

```mermaid
sequenceDiagram
    participant Client as Client
    participant API as API Gateway
    participant Admin as Admin Service
    participant Storage as Key Storage
    
    Client->>API: POST /setup
    API->>Admin: Check if setup completed
    Admin->>Storage: Check admin keys
    Storage-->>Admin: No admin keys found
    Admin->>Storage: Create admin key
    Storage-->>Admin: Return admin key
    Admin-->>API: Return setup result
    API-->>Client: 200 OK (with admin key)
    
    Note over Client,Storage: This is a one-time operation that can only be performed on a new system
```

```
POST /setup
```

#### Request Body

```json
{
  "name": "Admin User",
  "email": "admin@example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Name of the first admin |
| `email` | string | Yes | Email of the first admin |

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "key": "km_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "name": "Admin User (Super Admin)",
  "email": "admin@example.com",
  "role": "SUPER_ADMIN",
  "scopes": [
    "admin:keys:create",
    "admin:keys:read",
    "admin:keys:revoke",
    "admin:keys:rotate",
    "admin:users:create",
    "admin:users:read",
    "admin:users:revoke",
    "admin:system:security",
    "admin:system:config"
  ],
  "status": "active",
  "createdAt": 1642723200000
}
```

#### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 409 | `CONFLICT` | Setup already completed |

#### Example

```bash
curl -X POST https://api.example.com/setup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com"
  }'
```

**Important**: This endpoint can only be called once. The admin API key is only returned in this initial response and cannot be retrieved later.

### System Status

Provides system status information.

```
GET /system/status
```

#### Authentication

No authentication required.

#### Response

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "timestamp": 1642723200000
}
```

#### Example

```bash
curl https://api.example.com/system/status
```

### System Configuration

Retrieves the current system configuration (redacted for security).

```mermaid
classDiagram
    class SystemConfiguration {
        +EncryptionConfig encryption
        +HmacConfig hmac
        +KeysConfig keys
        +LoggingConfig logging
        +SecurityConfig security
        +RoutingConfig routing
        +ProxyConfig proxy
    }
    
    class EncryptionConfig {
        +String algorithm
        +Number iterations
    }
    
    class HmacConfig {
        +String algorithm
    }
    
    class KeysConfig {
        +String prefix
        +Number defaultExpirationDays
        +Number maxNameLength
    }
    
    class LoggingConfig {
        +String level
        +Boolean includeTrace
    }
    
    class SecurityConfig {
        +CorsConfig cors
    }
    
    class CorsConfig {
        +String allowOrigin
        +String allowMethods
        +String allowHeaders
    }
    
    class RoutingConfig {
        +VersioningConfig versioning
    }
    
    class VersioningConfig {
        +Boolean enabled
        +String current
        +String[] supported
        +String[] deprecated
    }
    
    class ProxyConfig {
        +Boolean enabled
        +Object services
    }
    
    SystemConfiguration *-- EncryptionConfig
    SystemConfiguration *-- HmacConfig
    SystemConfiguration *-- KeysConfig
    SystemConfiguration *-- LoggingConfig
    SystemConfiguration *-- SecurityConfig
    SystemConfiguration *-- RoutingConfig
    SystemConfiguration *-- ProxyConfig
    SecurityConfig *-- CorsConfig
    RoutingConfig *-- VersioningConfig
```

```
GET /system/config
```

#### Authentication

Requires an admin API key with the `admin:system:config` permission.

#### Response

```json
{
  "encryption": {
    "algorithm": "AES-GCM",
    "iterations": 100000
  },
  "hmac": {
    "algorithm": "SHA-384"
  },
  "keys": {
    "prefix": "km_",
    "defaultExpirationDays": 0,
    "maxNameLength": 255
  },
  "logging": {
    "level": "info",
    "includeTrace": true
  },
  "security": {
    "cors": {
      "allowOrigin": "https://admin.example.com",
      "allowMethods": "GET, POST, PUT, DELETE, OPTIONS",
      "allowHeaders": "Content-Type, Authorization, X-API-Key"
    }
  },
  "routing": {
    "versioning": {
      "enabled": true,
      "current": "1",
      "supported": ["1"],
      "deprecated": []
    }
  },
  "proxy": {
    "enabled": true,
    "services": {
      "auth": {
        "target": "https://auth.example.com"
      },
      "users": {
        "target": "https://users.example.com"
      }
    }
  }
}
```

#### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 403 | `FORBIDDEN` | Insufficient permissions |

#### Example

```bash
curl https://api.example.com/system/config \
  -H "X-API-Key: km_your_admin_key"
```

## API Gateway Features

### Proxy Request

The API Gateway can proxy requests to upstream services based on the configured routes.

```mermaid
sequenceDiagram
    participant Client as Client
    participant Gateway as API Gateway
    participant CircuitBreaker as Circuit Breaker
    participant Upstream as Upstream Service
    
    Client->>Gateway: Request to /api/users/profiles/123
    Gateway->>Gateway: Authenticate & Authorize
    Gateway->>CircuitBreaker: Check Circuit Status
    
    alt Circuit Closed
        CircuitBreaker->>Upstream: Forward Request
        Upstream-->>CircuitBreaker: Response
        CircuitBreaker-->>Gateway: Forward Response
        Gateway-->>Client: Return Response
    else Circuit Open
        CircuitBreaker-->>Gateway: Circuit Open Error
        Gateway-->>Client: 503 Service Unavailable
    else Circuit Half-Open
        CircuitBreaker->>Upstream: Test Request
        Upstream-->>CircuitBreaker: Response
        CircuitBreaker-->>Gateway: Forward Response
        Gateway-->>Client: Return Response
    end
```

```
[ANY] /api/:service/*
```

#### Authentication

Requires a valid API key with appropriate scopes for the service.

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `:service` | The name of the upstream service to proxy to |
| `*` | The rest of the path to forward to the service |

#### Example

```bash
curl https://api.example.com/api/users/profiles/123 \
  -H "X-API-Key: km_your_api_key" \
  -H "Content-Type: application/json"
```

This would proxy the request to the configured `users` service, forwarding to its `/profiles/123` endpoint.

## Errors

### Error Response Format

All errors follow a consistent JSON format:

```mermaid
classDiagram
    class ErrorResponse {
        +String error
        +String code
        +Object details
    }
    
    class ValidationError {
        +String field1
        +String field2
    }
    
    ErrorResponse *-- ValidationError : details
```

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field1": "Specific error for field1",
    "field2": "Specific error for field2"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `error` | string | Human-readable error message |
| `code` | string | Error code for programmatic handling |
| `details` | object | Optional field-specific errors |

### Error Codes

```mermaid
graph LR
    A[API Errors] --> B[Client Errors 4xx]
    A --> C[Server Errors 5xx]
    
    B --> B1[400 VALIDATION_ERROR]
    B --> B2[401 UNAUTHORIZED]
    B --> B3[403 FORBIDDEN]
    B --> B4[404 NOT_FOUND]
    B --> B5[409 CONFLICT]
    B --> B6[429 RATE_LIMITED]
    
    C --> C1[500 INTERNAL_ERROR]
    C --> C2[502 BAD_GATEWAY]
    C --> C3[503 SERVICE_UNAVAILABLE]
    C --> C4[504 GATEWAY_TIMEOUT]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:1px
    style C fill:#ffb,stroke:#333,stroke-width:1px
```

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Missing or invalid API key |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 502 | `BAD_GATEWAY` | Upstream service error |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| 504 | `GATEWAY_TIMEOUT` | Upstream service timeout |

For more detailed information about error handling, see [ERROR_HANDLING.md](./ERROR_HANDLING.md).

## Webhooks

The API Gateway supports webhooks for key lifecycle events.

```mermaid
sequenceDiagram
    participant Gateway as API Gateway
    participant Event as Event Bus
    participant Webhook as Webhook Service
    participant Client as Webhook Endpoint
    
    Gateway->>Event: Key Event (created/revoked/rotated/expired)
    Event->>Webhook: Publish Event
    Webhook->>Client: POST Event to Webhook URL
    Client-->>Webhook: 200 OK
```

### Event Types

| Event | Description |
|-------|-------------|
| `key.created` | A new API key was created |
| `key.revoked` | An API key was revoked |
| `key.rotated` | An API key was rotated |
| `key.expired` | An API key expired |

### Webhook Payload Format

```json
{
  "event": "key.created",
  "timestamp": 1642723200000,
  "data": {
    "keyId": "550e8400-e29b-41d4-a716-446655440000",
    "owner": "application-name",
    "status": "active"
  }
}
```

Webhook configuration is done through the system configuration. See [CONFIGURATION.md](./CONFIGURATION.md) for details.

## Rate Limiting

The API Gateway implements rate limiting to prevent abuse:

```mermaid
flowchart TD
    A[Incoming Request] --> B{Check Rate Limit}
    B -->|Limit Not Exceeded| C[Process Request]
    B -->|Limit Exceeded| D[Return 429 Too Many Requests]
    
    C --> E[Send Response Headers]
    E --> F[X-RateLimit-Limit]
    E --> G[X-RateLimit-Remaining]
    E --> H[X-RateLimit-Reset]
    
    D --> I[Send Retry-After Header]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#dfd,stroke:#333,stroke-width:1px
    style D fill:#fdd,stroke:#333,stroke-width:1px
```

1. Default limits:
   - `/validate` endpoint: 300 req/min
   - `/keys` endpoint: 60 req/min
   - Other endpoints: 100 req/min

2. Rate limit response headers:
   - `X-RateLimit-Limit`: Total allowed requests per window
   - `X-RateLimit-Remaining`: Remaining requests in current window
   - `X-RateLimit-Reset`: Time (Unix timestamp) when window resets

3. When rate limited, receives a 429 Too Many Requests response:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "details": {
    "retryAfter": 45,
    "limit": 100,
    "reset": 1642723245000
  }
}
```

Rate limits can be configured through the system configuration. See [CONFIGURATION.md](./CONFIGURATION.md) for details.

## Additional Documentation

For more detailed information, refer to these additional documents:

- [Architecture Overview](./ARCHITECTURE.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Security Documentation](./SECURITY.md)
- [Error Handling](./ERROR_HANDLING.md)
- [Gateway Features](./GATEWAY.md)
- [Tutorials](./TUTORIALS.md)