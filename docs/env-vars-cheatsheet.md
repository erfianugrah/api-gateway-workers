# Environment Variables Cheat Sheet

This cheat sheet provides a quick reference for the most commonly used environment variables in the API Gateway service.

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

# Security Headers
CONFIG_SECURITY_HEADERS_X_CONTENT_TYPE_OPTIONS="nosniff"
CONFIG_SECURITY_HEADERS_X_FRAME_OPTIONS="DENY"
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

# Endpoint-specific rate limits
CONFIG_RATELIMIT_ENDPOINTS_VALIDATE_LIMIT="300"
CONFIG_RATELIMIT_ENDPOINTS_KEYS_LIMIT="60"
CONFIG_RATELIMIT_ENDPOINTS_API_USERS_LIMIT="50"
CONFIG_RATELIMIT_ENDPOINTS_API_USERS_WINDOW="30000"
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

# Services
CONFIG_PROXY_SERVICES_USERSERVICE_TARGET="https://users-api.example.com"
CONFIG_PROXY_SERVICES_USERSERVICE_TIMEOUT="10000"
CONFIG_PROXY_SERVICES_USERSERVICE_PATHREWRITE='{"^/api/users":"/v2/users"}'
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

For a complete reference of all available configuration options, see the [Configuration Guide](./configuration.md).