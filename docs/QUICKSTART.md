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
git clone https://github.com/yourusername/key-manager-workers.git
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

## Local Development

Start a local development server:

```bash
npm run dev
```

This will start the API Key Manager service on `http://localhost:8787`.

## Using the API

### Creating an API Key

```bash
curl -X POST http://localhost:8787/keys \
  -H "Content-Type: application/json" \
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
curl http://localhost:8787/keys
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

### Getting API Key Details

```bash
curl http://localhost:8787/keys/d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94
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

### Validating an API Key

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

### Revoking an API Key

```bash
curl -X DELETE http://localhost:8787/keys/d8e8fca2-dc0f-4db4-ac8c-5b6b4a4b9a94
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

## Client Integration

Here are examples of how to integrate the API Key Manager with your applications.

### JavaScript/Node.js Example

```javascript
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
  return result.valid;
}

// Usage
const isValid = await validateApiKey('km_a95c530a7af5f492a74499e70578d150...', ['read:data']);
if (isValid) {
  // Proceed with protected operation
} else {
  // Reject the request
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
    return result.get('valid', False)

# Usage
is_valid = validate_api_key('km_a95c530a7af5f492a74499e70578d150...', ['read:data'])
if is_valid:
    # Proceed with protected operation
else:
    # Reject the request
```

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

This will deploy the API Key Manager service to Cloudflare Workers using Wrangler.

## Next Steps

- Read the full [API documentation](./API.md)
- Learn about the [architecture](./ARCHITECTURE.md)
- Understand the [security implementation](./SECURITY.md)
- See how to [contribute](../CONTRIBUTING.md)

## Troubleshooting

### Common Issues

**Error: Cannot find Durable Object binding**

Make sure your `wrangler.jsonc` file has the correct Durable Object binding:

```json
{
  "durable_objects": {
    "bindings": [
      {
        "name": "KEY_MANAGER",
        "class_name": "KeyManagerDurableObject"
      }
    ]
  }
}
```

**Error: Rate limit exceeded**

The service includes rate limiting to prevent abuse. If you're seeing rate limit errors, you may need to reduce the frequency of your requests or increase the rate limit in your configuration.

**Error: Invalid API key format**

Ensure your API keys are in the correct format (starting with `km_` followed by a hex string) and have not been truncated or modified.

For more help, please [open an issue](https://github.com/yourusername/key-manager-workers/issues).