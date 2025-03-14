# Environment Variables Cheat Sheet

This cheat sheet provides a quick reference for the most commonly used environment variables in the API Gateway service.

## Environment Detection

```bash
# Set to "production" to enable production validation rules
NODE_ENV="production"

# Alternative way to enable production validation
CONFIG_ENV="production"
```

## Core Configuration

```bash
# Required for production
CONFIG_ENCRYPTION_KEY="your-secure-encryption-key"
CONFIG_HMAC_SECRET="your-secure-hmac-secret"

# Configuration file
CONFIG_PATH="/path/to/config.json"
```

## Security & CORS

```bash
# API Key Header
CONFIG_SECURITY_APIKEYHEADER="X-API-Key"

# CORS Settings
CONFIG_SECURITY_CORS_ALLOWORIGIN="https://your-app.example.com"
CONFIG_SECURITY_CORS_ALLOWMETHODS="GET, POST, PUT, DELETE, OPTIONS"
CONFIG_SECURITY_CORS_ALLOWHEADERS="Content-Type, Authorization, X-API-Key, X-Request-ID"
CONFIG_SECURITY_CORS_MAXAGE="86400"

# Option 1: Security Headers via JSON object
CONFIG_SECURITY_HEADERS='{"X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Strict-Transport-Security":"max-age=31536000; includeSubDomains","X-XSS-Protection":"1; mode=block"}'

# Option 2: Security Headers via individual variables
CONFIG_SECURITY_HEADERS_X_CONTENT_TYPE_OPTIONS="nosniff"
CONFIG_SECURITY_HEADERS_X_FRAME_OPTIONS="DENY"
CONFIG_SECURITY_HEADERS_STRICT_TRANSPORT_SECURITY="max-age=31536000; includeSubDomains"
CONFIG_SECURITY_HEADERS_X_XSS_PROTECTION="1; mode=block"
```

## Logging

```bash
CONFIG_LOGGING_LEVEL="info"  # error, warn, info, debug, trace
CONFIG_LOGGING_INCLUDETRACE="false"
CONFIG_LOGGING_REQUESTIDHEADER="X-Request-ID"
```

## Rate Limiting

```bash
CONFIG_RATELIMIT_DEFAULTLIMIT="100"
CONFIG_RATELIMIT_DEFAULTWINDOW="60000"

# Option 1: Rate limits via JSON object
CONFIG_RATELIMIT_ENDPOINTS='{"\/api\/validate":{"limit":300},"\/api\/keys":{"limit":60},"\/api\/users":{"limit":50,"window":30000}}'

# Option 2: Rate limits via structured environment variables
CONFIG_RATELIMIT_ENDPOINTS_API_VALIDATE_LIMIT="300"
CONFIG_RATELIMIT_ENDPOINTS_API_KEYS_LIMIT="60"
CONFIG_RATELIMIT_ENDPOINTS_API_USERS_LIMIT="50"
CONFIG_RATELIMIT_ENDPOINTS_API_USERS_WINDOW="30000"

# Rate limit response headers
CONFIG_RATELIMIT_HEADERS_LIMIT="X-RateLimit-Limit"
CONFIG_RATELIMIT_HEADERS_REMAINING="X-RateLimit-Remaining"
CONFIG_RATELIMIT_HEADERS_RESET="X-RateLimit-Reset"
```

## API Versioning

```bash
CONFIG_ROUTING_VERSIONING_ENABLED="true"
CONFIG_ROUTING_VERSIONING_CURRENT="1"
CONFIG_ROUTING_VERSIONING_SUPPORTED='["1","2"]'
CONFIG_ROUTING_VERSIONING_DEPRECATED='["0"]'
CONFIG_ROUTING_VERSIONING_VERSIONHEADER="X-API-Version"
```

## Proxy Settings

```bash
CONFIG_PROXY_ENABLED="true"
CONFIG_PROXY_TIMEOUT="5000"

# Circuit Breaker
CONFIG_PROXY_CIRCUITBREAKER_ENABLED="true"
CONFIG_PROXY_CIRCUITBREAKER_FAILURETHRESHOLD="5"
CONFIG_PROXY_CIRCUITBREAKER_RESETTIMEOUT="30000"

# Retry
CONFIG_PROXY_RETRY_ENABLED="true"
CONFIG_PROXY_RETRY_MAXATTEMPTS="3"
CONFIG_PROXY_RETRY_BACKOFF="1000"

# Option 1: Services via JSON object
CONFIG_PROXY_SERVICES='{"userservice":{"target":"https://users-api.example.com","timeout":10000,"pathRewrite":{"^/api/users":"/v2/users"}},"authservice":{"target":"https://auth-api.example.com"}}'

# Option 2: Services via structured environment variables
CONFIG_PROXY_SERVICES_USERSERVICE_TARGET="https://users-api.example.com"
CONFIG_PROXY_SERVICES_USERSERVICE_TIMEOUT="10000"
CONFIG_PROXY_SERVICES_USERSERVICE_PATHREWRITE='{"^/api/users":"/v2/users"}'
CONFIG_PROXY_SERVICES_USERSERVICE_HEADERS='{"X-Internal-Service":"gateway"}'

CONFIG_PROXY_SERVICES_AUTHSERVICE_TARGET="https://auth-api.example.com"
CONFIG_PROXY_SERVICES_AUTHSERVICE_TIMEOUT="5000"
```

## Key Management

```bash
CONFIG_KEYS_PREFIX="km_"
CONFIG_KEYS_DEFAULTEXPIRATIONDAYS="90"
```

## Maintenance

```bash
CONFIG_MAINTENANCE_CLEANUPINTERVALHOURS="24"
CONFIG_MAINTENANCE_RETRYINTERVALHOURS="1"
```

## Legacy Variables (Backward Compatibility)

```bash
# These are supported for backward compatibility
ENCRYPTION_KEY="your-secure-encryption-key"
HMAC_SECRET="your-secure-hmac-secret"
KEY_PREFIX="km_"
RATE_LIMIT="100"
CORS_ALLOW_ORIGIN="https://your-app.example.com"
API_KEY_HEADER="X-API-Key"
LOG_LEVEL="info"
REQUEST_ID_HEADER="X-Request-ID"
```

## Production Example

Here's a comprehensive production configuration example:

```bash
# Enable production mode
NODE_ENV=production

# Required secure values (MUST be set)
CONFIG_ENCRYPTION_KEY="your-secure-encryption-key"
CONFIG_HMAC_SECRET="your-secure-hmac-secret"

# Security configuration (recommended)
CONFIG_SECURITY_CORS_ALLOWORIGIN="https://your-app.example.com"
CONFIG_SECURITY_CORS_MAXAGE="86400"
CONFIG_SECURITY_HEADERS_STRICT_TRANSPORT_SECURITY="max-age=31536000; includeSubDomains"
CONFIG_SECURITY_HEADERS_X_CONTENT_TYPE_OPTIONS="nosniff"
CONFIG_SECURITY_HEADERS_X_FRAME_OPTIONS="DENY"
CONFIG_SECURITY_HEADERS_X_XSS_PROTECTION="1; mode=block"

# Proxy services (optional)
CONFIG_PROXY_ENABLED="true"
CONFIG_PROXY_SERVICES_USERSERVICE_TARGET="https://users-api.internal.example.com"
CONFIG_PROXY_SERVICES_USERSERVICE_PATHREWRITE='{"^/api/users":""}'
CONFIG_PROXY_SERVICES_AUTHSERVICE_TARGET="https://auth-api.internal.example.com"
CONFIG_PROXY_SERVICES_AUTHSERVICE_PATHREWRITE='{"^/api/auth":""}'

# Rate limits (recommended)
CONFIG_RATELIMIT_DEFAULTLIMIT="100"
CONFIG_RATELIMIT_ENDPOINTS_API_KEYS_LIMIT="60"
CONFIG_RATELIMIT_ENDPOINTS_API_VALIDATE_LIMIT="300"

# Production logging (minimal)
CONFIG_LOGGING_LEVEL="error"
CONFIG_LOGGING_INCLUDETRACE="false"
```

For a complete reference of all available configuration options, see the [Configuration Guide](../guides/configuration-guide.md).