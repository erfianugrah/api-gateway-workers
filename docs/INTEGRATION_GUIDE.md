# API Key Manager Integration Guide

This guide explains how to integrate the modular authentication system with your existing API Key Manager.

## Architecture Overview

The new authentication system is designed as a self-contained module that:

1. Manages admin users via API keys
2. Provides role-based access control
3. Enforces permissions for administrative operations
4. Logs all admin actions for accountability

The beauty of this design is that it uses the same API key system to manage itself, creating an elegant, self-referential system.

## Integration Steps

Follow these steps to integrate the authentication module with your existing codebase:

### Step 1: File Structure Setup

First, create the auth module directory structure:

```bash
mkdir -p src/auth
```

Copy the following files to your project:

- `src/auth/index.js` - Main auth module export
- `src/auth/keyValidator.js` - API key validation
- `src/auth/keyGenerator.js` - API key generation
- `src/auth/roles.js` - Role definitions and permissions
- `src/auth/adminManager.js` - Admin user management
- `src/auth/auditLogger.js` - Audit logging

### Step 2: Update Dependencies

Add the required dependencies to your `package.json`:

```json
{
  "dependencies": {
    "uuid": "^9.0.0"
  }
}
```

Run `npm install` to install the dependencies.

### Step 3: Update Main Worker

Replace your existing `src/index.js` with the updated version that includes the auth module integration, or update it to include these key components:

1. Import the auth module: `import * as auth from './auth/index.js';`
2. Add the setup endpoint for first-time initialization
3. Add admin authentication to protected routes
4. Update request handling to include admin information in forwarded requests

### Step 4: Update KeyManagerDurableObject

Update your `src/lib/KeyManagerDurableObject.js` to:

1. Extract admin information from request headers
2. Pass admin information to route handlers
3. Add permission checks for protected operations

### Step 5: Update Route Handlers

Update your route handlers in `src/handlers/keys.js` to:

1. Accept admin information as a parameter
2. Check permissions using the `hasPermission` function
3. Log admin actions using the `logAdminAction` function

### Step 6: Configure Wrangler

Update your `wrangler.jsonc` with the configuration provided in this repository:

1. Create KV namespaces for each environment:
   ```bash
   # Create KV namespace for production
   wrangler kv:namespace create "KEYS"
   
   # Create KV namespace for staging
   wrangler kv:namespace create "KEYS" --env staging
   
   # Create KV namespace for development
   wrangler kv:namespace create "KEYS" --env development
   
   # Create KV namespace for testing
   wrangler kv:namespace create "KEYS" --env test
   ```

2. Update your `wrangler.jsonc` with the KV namespace IDs.

3. Set the JWT secret for production (do NOT store this in wrangler.jsonc):
   ```bash
   # Generate a strong secret
   JWT_SECRET=$(openssl rand -hex 32)
   echo "Your JWT secret is: $JWT_SECRET"
   
   # Set it in Wrangler
   wrangler secret put JWT_SECRET
   
   # Also set it for staging
   wrangler secret put JWT_SECRET --env staging
   ```

### Step 7: Deploy the Service

Deploy your service:

```bash
# Deploy to production
wrangler deploy

# Or deploy to staging
wrangler deploy --env staging
```

### Step 8: Initial Setup

Perform the first-time setup to create the super admin:

```bash
curl -X POST https://api-keys.yourcompany.com/setup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "email": "admin@example.com"
  }'
```

Save the API key from the response - it will only be shown once.

## Using the API Key Manager

### Authentication

For all admin operations, include your API key in the `X-Api-Key` header:

```
X-Api-Key: km_your_api_key_here
```

### Creating API Keys

```bash
curl -X POST https://api-keys.yourcompany.com/keys \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: km_your_admin_key" \
  -d '{
    "name": "Service API Key",
    "owner": "Example Service",
    "scopes": ["read:data", "write:data"]
  }'
```

### Listing API Keys

```bash
curl https://api-keys.yourcompany.com/keys \
  -H "X-Api-Key: km_your_admin_key"
```

### Revoking API Keys

```bash
curl -X DELETE https://api-keys.yourcompany.com/keys/key_id_here \
  -H "X-Api-Key: km_your_admin_key"
```

### Key Validation (Public Endpoint)

This endpoint does not require admin authentication:

```bash
curl -X POST https://api-keys.yourcompany.com/validate \
  -H "Content-Type: application/json" \
  -d '{
    "key": "km_api_key_to_validate",
    "scopes": ["read:data"]
  }'
```

## Local Development

For local development:

```bash
# Start the development server
wrangler dev --env development
```

This will use the development settings from `wrangler.jsonc`.

## Administrative Roles

The system comes with predefined roles:

1. **SUPER_ADMIN**: Full system access
2. **KEY_ADMIN**: Can manage API keys
3. **KEY_VIEWER**: Can only view API keys
4. **USER_ADMIN**: Can manage admin users
5. **SUPPORT**: Limited read-only access

Custom roles with specific permissions can also be created.

## Additional Features

### Role-Based Access Control

Permissions are enforced based on the admin's role:

- `admin:keys:create` - Create new API keys
- `admin:keys:read` - View API keys
- `admin:keys:update` - Update API key properties
- `admin:keys:revoke` - Revoke API keys
- `admin:users:*` - Manage admin users
- `admin:system:*` - Manage system settings

### Audit Logging

All admin actions are logged for accountability:

- Who performed the action
- What action was performed
- When the action occurred
- Additional context about the action

## Troubleshooting

### Setup Issues

- **"Missing KV binding"**: Ensure your KV namespace is correctly configured in `wrangler.jsonc`.
- **"Setup already completed"**: You can only run the setup once. Use an existing admin key to create new admins.

### Authentication Issues

- **"Invalid API key"**: Check that you're using the correct API key.
- **"Permission denied"**: The API key does not have the required permission scope.

### JWT Secret Issues

- **"JWT verification failed"**: Make sure you've set the JWT_SECRET in Wrangler using `wrangler secret put JWT_SECRET`.

### KV Storage Issues

- If you encounter KV errors, check:
  - The KV namespace exists
  - The ID in wrangler.jsonc is correct
  - You have the necessary permissions

## Security Best Practices

1. **JWT Secret**: Generate a strong, random JWT secret and keep it secure.
2. **Production Environment**: Use the production environment for real deployments.
3. **Custom Domain**: Configure your custom domain for production.
4. **Rate Limiting**: Consider implementing rate limiting for public endpoints.
5. **Regular Auditing**: Regularly review the audit logs for suspicious activity.

## Next Steps

1. Implement a user interface for API key management
2. Add additional admin endpoints for user management
3. Enhance audit logging with more detailed information
4. Implement key rotation functionality
