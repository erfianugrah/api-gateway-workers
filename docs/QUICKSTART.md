# Quick Start Guide

This guide will help you quickly get started with the API Key Manager service.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (v7 or higher)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (for Cloudflare Workers)
- A Cloudflare account (free tier is sufficient)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/erfianugrah/key-manager-workers.git
cd key-manager-workers
```

2. Install dependencies:

```bash
npm install
```

3. Configure your Cloudflare credentials:

```bash
wrangler login
```

4. Configure the KV namespaces in your wrangler.jsonc file:

```bash
# Create KV namespace for your environment
wrangler kv:namespace create "KV" 
```

Copy the ID from the output and update your wrangler.jsonc file with the correct KV namespace ID.

## Local Development

Start a local development server:

```bash
npm run dev
```

This will start the API Key Manager service on `http://localhost:8787`.

## First-Time Setup

When you first deploy the service, you need to create the initial super admin:

```bash
curl -X POST http://localhost:8787/setup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "email": "admin@example.com"
  }'
```

Response:

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

**Important**: Save the API key from the response securely. It will only be shown once and cannot be recovered later.

## Administrative Operations

All administrative operations require an API key with appropriate permissions. Include your admin API key in the `X-Api-Key` header for all administrative requests.

### Creating an API Key

```bash
curl -X POST http://localhost:8787/keys \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: km_your_admin_key_here" \
  -d '{
    "name": "My API Key",
    "owner": "user@example.com",
    "scopes": ["read:data", "write:data"],
    "expiresAt": 1735689600000
  }'
```

Response:

```json
{
  "id": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
  "name": "My API Key",
  "owner": "user@example.com",
  "scopes": ["read:data", "write:data"],
  "status": "active",
  "createdAt": 1677609600000,
  "expiresAt": 1735689600000,
  "lastUsedAt": 0,
  "key": "km_a95c530a7af5f492a74499e70578d150..."
}
```

### Listing API Keys

```bash
curl http://localhost:8787/keys \
  -H "X-Api-Key: km_your_admin_key_here"
```

Response:

```json
[
  {
    "id": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
    "name": "My API Key",
    "owner": "user@example.com",
    "scopes": ["read:data", "write:data"],
    "status": "active",
    "createdAt": 1677609600000,
    "expiresAt": 1735689600000,
    "lastUsedAt": 1677695999000
  }
]
```

For more efficient pagination with large datasets, use the cursor-based endpoint:

```bash
curl "http://localhost:8787/keys-cursor?limit=10" \
  -H "X-Api-Key: km_your_admin_key_here"
```

### Getting API Key Details

```bash
curl http://localhost:8787/keys/d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94 \
  -H "X-Api-Key: km_your_admin_key_here"
```

Response:

```json
{
  "id": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
  "name": "My API Key",
  "owner": "user@example.com",
  "scopes": ["read:data", "write:data"],
  "status": "active",
  "createdAt": 1677609600000,
  "expiresAt": 1735689600000,
  "lastUsedAt": 1677695999000
}
```

### Rotating an API Key

To rotate a key (create a new key while maintaining a grace period for the old one):

```bash
curl -X POST http://localhost:8787/keys/d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94/rotate \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: km_your_admin_key_here" \
  -d '{
    "gracePeriodDays": 30,
    "name": "Rotated Key Name"
  }'
```

Response:

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

### Revoking an API Key

```bash
curl -X DELETE http://localhost:8787/keys/d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94 \
  -H "X-Api-Key: km_your_admin_key_here"
```

Response:

```json
{
  "success": true,
  "message": "API key revoked successfully",
  "id": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
  "name": "My API Key",
  "revokedAt": 1677695999000
}
```

## Public Endpoints

### Validating an API Key

The validation endpoint is public (doesn't require admin authentication) and can be used by your services to validate API keys.

Using the key in the request body:

```bash
curl -X POST http://localhost:8787/validate \
  -H "Content-Type: application/json" \
  -d '{
    "key": "km_a95c530a7af5f492a74499e70578d150...",
    "scopes": ["read:data"]
  }'
```

Or using the key in the header:

```bash
curl -X POST http://localhost:8787/validate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: km_a95c530a7af5f492a74499e70578d150..." \
  -d '{
    "scopes": ["read:data"]
  }'
```

Response (valid key):

```json
{
  "valid": true,
  "owner": "user@example.com",
  "scopes": ["read:data", "write:data"],
  "keyId": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94"
}
```

Response (rotated key):

```json
{
  "valid": true,
  "owner": "user@example.com",
  "scopes": ["read:data", "write:data"],
  "keyId": "d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94",
  "warning": "This API key has been rotated. Please switch to the new key before 2023-01-15T00:00:00.000Z",
  "rotatedToId": "f9e7d6c5-b4a3-2d1c-e0f9-8b7a6c5d4e3f",
  "gracePeriodEnds": 1673740800000
}
```

### Health Check

```bash
curl http://localhost:8787/health
```

Response:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": 1677609600000
}
```

## System Administration

### Running Maintenance Tasks

To manually trigger cleanup of expired keys (requires admin:system:maintenance permission):

```bash
curl -X POST http://localhost:8787/maintenance/cleanup \
  -H "X-Api-Key: km_your_admin_key_here"
```

Response:

```json
{
  "revokedCount": 5,
  "staleCount": 2,
  "rotationCount": 3,
  "timestamp": 1677695999000
}
```

### Viewing Audit Logs

To view admin action logs (requires admin:system:logs permission):

```bash
curl "http://localhost:8787/logs/admin?limit=10" \
  -H "X-Api-Key: km_your_admin_key_here"
```

Response:

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

## Role-Based Access Control

The API Key Manager uses role-based access control with the following predefined roles:

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| SUPER_ADMIN | Full system access | admin:keys:*, admin:users:*, admin:system:* |
| KEY_ADMIN | API key management | admin:keys:create, admin:keys:read, admin:keys:revoke |
| KEY_VIEWER | Read-only key access | admin:keys:read |
| USER_ADMIN | Admin user management | admin:users:create, admin:users:read, admin:users:revoke |
| SUPPORT | Limited support access | admin:keys:read, admin:users:read |
| CUSTOM | Custom permissions | (as specified during creation) |

## Client Integration

Here are examples of how to integrate the API Key Manager with your applications.

### JavaScript/Node.js Example

```javascript
// Validate an API key
async function validateApiKey(apiKey, requiredScopes = []) {
  const response = await fetch('https://your-worker.workers.dev/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ scopes: requiredScopes })
  });
  
  const result = await response.json();
  
  if (result.valid) {
    // Check for rotation warning
    if (result.warning) {
      console.warn(`API Key Warning: ${result.warning}`);
    }
    return true;
  } else {
    console.error(`API Key Error: ${result.error}`);
    return false;
  }
}

// Administrative operations example
async function createApiKey(adminKey, keyData) {
  const response = await fetch('https://your-worker.workers.dev/keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': adminKey
    },
    body: JSON.stringify(keyData)
  });
  
  if (response.ok) {
    return await response.json();
  } else {
    const error = await response.json();
    throw new Error(`Failed to create API key: ${error.error}`);
  }
}
```

### Python Example

```python
import requests

def validate_api_key(api_key, required_scopes=None):
    if required_scopes is None:
        required_scopes = []
        
    response = requests.post(
        'https://your-worker.workers.dev/validate',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        },
        json={'scopes': required_scopes}
    )
    
    result = response.json()
    
    if result.get('valid', False):
        # Check for rotation warning
        if 'warning' in result:
            print(f"API Key Warning: {result['warning']}")
        return True
    else:
        print(f"API Key Error: {result.get('error', 'Unknown error')}")
        return False

def create_api_key(admin_key, key_data):
    response = requests.post(
        'https://your-worker.workers.dev/keys',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': admin_key
        },
        json=key_data
    )
    
    if response.ok:
        return response.json()
    else:
        error = response.json()
        raise Exception(f"Failed to create API key: {error.get('error', 'Unknown error')}")
```

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

This will deploy the API Key Manager service to Cloudflare Workers using Wrangler.

## Environment Variables

Set the following secret environment variables for production:

```bash
# Generate secure random values for these secrets
wrangler secret put ENCRYPTION_KEY
wrangler secret put HMAC_SECRET
```

## Next Steps

- Read the full [API documentation](./API.md)
- Learn about the [architecture](./ARCHITECTURE.md)
- Understand the [security implementation](./SECURITY.md)
- See how to [contribute](../CONTRIBUTING.md)

## Troubleshooting

### Common Issues

**"Missing KV binding"**

Make sure your `wrangler.jsonc` file has the correct KV namespace binding:

```json
{
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "your-kv-namespace-id-here"
    }
  ]
}
```

**"Setup has already been completed"**

The setup endpoint can only be called once. If you need to create additional admins, you need to use the existing super admin API key.

**"You do not have permission"**

This means your API key doesn't have the required permission scope for the operation you're trying to perform. Check the role and permissions associated with your API key.

**"Invalid API key format"**

Ensure your API keys are in the correct format (starting with `km_` followed by a hex string) and have not been truncated or modified.

For more help, please [open an issue](https://github.com/yourusername/key-manager-workers/issues).
