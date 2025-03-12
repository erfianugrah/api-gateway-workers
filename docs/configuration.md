# API Gateway Configuration Guide

This document details all configuration options available in the API Gateway service, explaining how to customize its behavior to suit your needs.

## Configuration System Overview

The API Gateway uses a flexible, layered configuration system that allows settings to be defined in multiple ways:

1. **Default values** - Sensible defaults are built into the system
2. **Configuration files** - Override defaults with JSON configuration files
3. **Environment variables** - Override both defaults and file settings with environment variables

This layered approach allows for maximum flexibility in different deployment scenarios, from local development to production deployments.

### Configuration Priority

When determining the value for a configuration option, the system uses the following priority order (highest to lowest):

1. Environment variables with `CONFIG_` prefix
2. Values from configuration file
3. Default values from the system

## Quick Start

The quickest way to get started is by creating a `config.json` file in your project root:

```json
{
  "encryption": {
    "key": "your-secure-encryption-key"
  },
  "hmac": {
    "secret": "your-secure-hmac-secret"
  },
  "security": {
    "cors": {
      "allowOrigin": "https://your-app.example.com"
    }
  }
}
```

Then start the server specifying the config file:

```bash
CONFIG_PATH=./config.json npm run dev
```

You can also use environment variables directly:

```bash
export CONFIG_ENCRYPTION_KEY="your-secure-encryption-key"
export CONFIG_HMAC_SECRET="your-secure-hmac-secret"
export CONFIG_SECURITY_CORS_ALLOWORIGIN="https://your-app.example.com"
npm run dev
```

## Configuration Methods

### Using a Configuration File

You can provide a JSON configuration file with your desired settings:

```bash
# Specify configuration file path with environment variable
CONFIG_PATH=/path/to/config.json npm run dev
```

An example configuration file is provided in `config.example.json`.

### Using Environment Variables

All configuration options can be set via environment variables with a `CONFIG_` prefix:

```bash
# Set configuration options via environment variables
CONFIG_LOGGING_LEVEL=debug npm run dev
```

Environment variables use underscore notation and are converted to the appropriate nested configuration structure. For example:

- `CONFIG_PROXY_ENABLED=true` sets `proxy.enabled` to `true`
- `CONFIG_SECURITY_CORS_ALLOWORIGIN=*` sets `security.cors.allowOrigin` to `*`

### Special Case: Complex Objects and Arrays

For complex objects like proxy services or arrays like supported API versions, you can:

1. Use JSON strings in environment variables:
   ```bash
   CONFIG_ROUTING_VERSIONING_SUPPORTED='["1","2","3"]'
   ```

2. Use specific syntax for services:
   ```bash
   CONFIG_PROXY_SERVICES_USERSERVICE_TARGET="https://users-api.example.com"
   CONFIG_PROXY_SERVICES_USERSERVICE_TIMEOUT="10000"
   ```

3. Use specific syntax for rate limit endpoints:
   ```bash
   CONFIG_RATELIMIT_ENDPOINTS_API_USERS_LIMIT="50"
   CONFIG_RATELIMIT_ENDPOINTS_API_USERS_WINDOW="30000"
   ```

## Configuration Reference

### Core Configuration

#### Encryption Settings

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `encryption.key` | Secret key for encrypting API keys at rest | string | "development-key-do-not-use-in-production" | `CONFIG_ENCRYPTION_KEY` |
| `encryption.algorithm` | Encryption algorithm to use | string | "AES-GCM" | `CONFIG_ENCRYPTION_ALGORITHM` |
| `encryption.iterations` | Number of iterations for key derivation | number | 100000 | `CONFIG_ENCRYPTION_ITERATIONS` |

> **Important:** The default encryption key should NEVER be used in production.

#### HMAC Settings

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `hmac.secret` | Secret for generating HMAC signatures | string | "development-hmac-do-not-use-in-production" | `CONFIG_HMAC_SECRET` |
| `hmac.algorithm` | HMAC algorithm to use | string | "SHA-384" | `CONFIG_HMAC_ALGORITHM` |

> **Important:** The default HMAC secret should NEVER be used in production.

#### Key Management Settings

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `keys.prefix` | Prefix for generated API keys | string | "km_" | `CONFIG_KEYS_PREFIX` |
| `keys.defaultExpirationDays` | Default expiration period in days (0 for no expiration) | number | 0 | `CONFIG_KEYS_DEFAULTEXPIRATIONDAYS` |
| `keys.maxNameLength` | Maximum length of key names | number | 255 | `CONFIG_KEYS_MAXNAMELENGTH` |
| `keys.maxOwnerLength` | Maximum length of key owner names | number | 255 | `CONFIG_KEYS_MAXOWNERLENGTH` |
| `keys.maxScopeLength` | Maximum length of individual scope strings | number | 100 | `CONFIG_KEYS_MAXSCOPELENGTH` |
| `keys.maxScopes` | Maximum number of scopes per key | number | 50 | `CONFIG_KEYS_MAXSCOPES` |

### Security Configuration

#### CORS Settings

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `security.cors.allowOrigin` | Value for Access-Control-Allow-Origin header | string | "*" | `CONFIG_SECURITY_CORS_ALLOWORIGIN` |
| `security.cors.allowMethods` | Value for Access-Control-Allow-Methods header | string | "GET, POST, PUT, DELETE, OPTIONS" | `CONFIG_SECURITY_CORS_ALLOWMETHODS` |
| `security.cors.allowHeaders` | Value for Access-Control-Allow-Headers header | string | "Content-Type, Authorization, X-API-Key" | `CONFIG_SECURITY_CORS_ALLOWHEADERS` |
| `security.cors.maxAge` | Value for Access-Control-Max-Age header in seconds | number | 86400 | `CONFIG_SECURITY_CORS_MAXAGE` |

#### API Key Authentication

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `security.apiKeyHeader` | Header name for API key authentication | string | "X-API-Key" | `CONFIG_SECURITY_APIKEYHEADER` |

#### Custom Security Headers

Custom security headers can be defined under `security.headers`:

```json
{
  "security": {
    "headers": {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    }
  }
}
```

or using environment variables:

```bash
CONFIG_SECURITY_HEADERS_X_CONTENT_TYPE_OPTIONS="nosniff"
CONFIG_SECURITY_HEADERS_X_FRAME_OPTIONS="DENY"
```

### Logging Configuration

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `logging.level` | Logging level (error, warn, info, debug, trace) | string | "info" (in dev) or "error" (in prod) | `CONFIG_LOGGING_LEVEL` |
| `logging.includeTrace` | Include stack traces in error logs | boolean | true (in dev) or false (in prod) | `CONFIG_LOGGING_INCLUDETRACE` |
| `logging.requestIdHeader` | Header name for request ID | string | "X-Request-ID" | `CONFIG_LOGGING_REQUESTIDHEADER` |

### Rate Limiting Configuration

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `rateLimit.defaultLimit` | Default rate limit per window | number | 100 | `CONFIG_RATELIMIT_DEFAULTLIMIT` |
| `rateLimit.defaultWindow` | Default rate limit window in milliseconds | number | 60000 | `CONFIG_RATELIMIT_DEFAULTWINDOW` |
| `rateLimit.headers.limit` | Header for rate limit | string | "X-RateLimit-Limit" | `CONFIG_RATELIMIT_HEADERS_LIMIT` |
| `rateLimit.headers.remaining` | Header for remaining requests | string | "X-RateLimit-Remaining" | `CONFIG_RATELIMIT_HEADERS_REMAINING` |
| `rateLimit.headers.reset` | Header for rate limit reset time | string | "X-RateLimit-Reset" | `CONFIG_RATELIMIT_HEADERS_RESET` |

#### Endpoint-Specific Rate Limits

You can define different rate limits for specific endpoints:

```json
{
  "rateLimit": {
    "endpoints": {
      "/validate": { "limit": 300 },
      "/keys": { "limit": 60 },
      "/api/users": { "limit": 50, "window": 30000 }
    }
  }
}
```

Environment variables follow this pattern:

```bash
CONFIG_RATELIMIT_ENDPOINTS_VALIDATE_LIMIT="300"
CONFIG_RATELIMIT_ENDPOINTS_KEYS_LIMIT="60"
CONFIG_RATELIMIT_ENDPOINTS_API_USERS_LIMIT="50"
CONFIG_RATELIMIT_ENDPOINTS_API_USERS_WINDOW="30000"
```

### Routing Configuration

#### API Versioning

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `routing.versioning.enabled` | Enable API versioning | boolean | true | `CONFIG_ROUTING_VERSIONING_ENABLED` |
| `routing.versioning.current` | Current API version | string | "1" | `CONFIG_ROUTING_VERSIONING_CURRENT` |
| `routing.versioning.supported` | List of supported API versions | array | ["1"] | `CONFIG_ROUTING_VERSIONING_SUPPORTED` |
| `routing.versioning.deprecated` | List of deprecated API versions | array | [] | `CONFIG_ROUTING_VERSIONING_DEPRECATED` |
| `routing.versioning.versionHeader` | Header to get API version from | string | "X-API-Version" | `CONFIG_ROUTING_VERSIONING_VERSIONHEADER` |

#### Path Parameter Validation

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `routing.paramValidation.id` | Regex pattern for ID parameters | string | UUID pattern | `CONFIG_ROUTING_PARAMVALIDATION_ID` |
| `routing.paramValidation.date` | Regex pattern for date parameters | string | YYYY-MM-DD pattern | `CONFIG_ROUTING_PARAMVALIDATION_DATE` |
| `routing.paramValidation.status` | Regex pattern for status parameters | string | (active\|revoked\|expired) | `CONFIG_ROUTING_PARAMVALIDATION_STATUS` |

Custom parameter validation patterns can also be added.

#### Route Priority

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `routing.priority.exact` | Priority for exact path matches | number | 1 | `CONFIG_ROUTING_PRIORITY_EXACT` |
| `routing.priority.parameter` | Priority for parametrized path matches | number | 2 | `CONFIG_ROUTING_PRIORITY_PARAMETER` |
| `routing.priority.regex` | Priority for regex path matches | number | 3 | `CONFIG_ROUTING_PRIORITY_REGEX` |

### Proxy Configuration

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `proxy.enabled` | Enable proxy functionality | boolean | false | `CONFIG_PROXY_ENABLED` |
| `proxy.timeout` | Default timeout for proxied requests in milliseconds | number | 30000 | `CONFIG_PROXY_TIMEOUT` |

#### Default Headers

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `proxy.headers` | Default headers to add to proxied requests | object | `{ "X-Forwarded-By": "key-manager-gateway" }` | JSON in `CONFIG_PROXY_HEADERS` |

#### Circuit Breaker

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `proxy.circuitBreaker.enabled` | Enable circuit breaker functionality | boolean | true | `CONFIG_PROXY_CIRCUITBREAKER_ENABLED` |
| `proxy.circuitBreaker.failureThreshold` | Number of failures before opening the circuit | number | 5 | `CONFIG_PROXY_CIRCUITBREAKER_FAILURETHRESHOLD` |
| `proxy.circuitBreaker.resetTimeout` | Time in milliseconds before attempting to close the circuit | number | 30000 | `CONFIG_PROXY_CIRCUITBREAKER_RESETTIMEOUT` |

#### Retry Configuration

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `proxy.retry.enabled` | Enable request retry functionality | boolean | true | `CONFIG_PROXY_RETRY_ENABLED` |
| `proxy.retry.maxAttempts` | Maximum number of retry attempts | number | 3 | `CONFIG_PROXY_RETRY_MAXATTEMPTS` |
| `proxy.retry.backoff` | Initial backoff in milliseconds (doubles with each retry) | number | 1000 | `CONFIG_PROXY_RETRY_BACKOFF` |

#### Proxy Services

You can define multiple upstream services for proxying:

```json
{
  "proxy": {
    "services": {
      "userService": {
        "target": "https://users-api.example.com",
        "pathRewrite": {
          "^/api/users": "/v2/users"
        },
        "headers": {
          "X-Service-Key": "your-service-key"
        },
        "timeout": 5000
      },
      "productService": {
        "target": "https://products-api.example.com",
        "pathRewrite": {
          "^/api/products": "/v1/products"
        }
      }
    }
  }
}
```

Environment variables follow this pattern:

```bash
CONFIG_PROXY_SERVICES_USERSERVICE_TARGET="https://users-api.example.com"
CONFIG_PROXY_SERVICES_USERSERVICE_TIMEOUT="5000"
CONFIG_PROXY_SERVICES_USERSERVICE_PATHREWRITE='{"^/api/users":"/v2/users"}'
CONFIG_PROXY_SERVICES_USERSERVICE_HEADERS='{"X-Service-Key":"your-service-key"}'

CONFIG_PROXY_SERVICES_PRODUCTSERVICE_TARGET="https://products-api.example.com"
CONFIG_PROXY_SERVICES_PRODUCTSERVICE_PATHREWRITE='{"^/api/products":"/v1/products"}'
```

### Maintenance Configuration

| Setting | Description | Type | Default | Environment Variable |
|---------|-------------|------|---------|---------------------|
| `maintenance.cleanupIntervalHours` | Interval in hours between cleanup operations | number | 24 | `CONFIG_MAINTENANCE_CLEANUPINTERVALHOURS` |
| `maintenance.retryIntervalHours` | Interval in hours before retrying a failed cleanup | number | 1 | `CONFIG_MAINTENANCE_RETRYINTERVALHOURS` |

## Legacy Environment Variables

For backward compatibility, the system also supports certain legacy environment variables without the `CONFIG_` prefix:

| Legacy Variable | New Environment Variable |
|-----------------|--------------------------|
| `ENCRYPTION_KEY` | `CONFIG_ENCRYPTION_KEY` |
| `HMAC_SECRET` | `CONFIG_HMAC_SECRET` |
| `KEY_PREFIX` | `CONFIG_KEYS_PREFIX` |
| `RATE_LIMIT` | `CONFIG_RATELIMIT_DEFAULTLIMIT` |
| `CORS_ALLOW_ORIGIN` | `CONFIG_SECURITY_CORS_ALLOWORIGIN` |
| `API_KEY_HEADER` | `CONFIG_SECURITY_APIKEYHEADER` |
| `LOG_LEVEL` | `CONFIG_LOGGING_LEVEL` |
| `REQUEST_ID_HEADER` | `CONFIG_LOGGING_REQUESTIDHEADER` |

Legacy variables have lower priority than the newer CONFIG_-prefixed variables.

## Production Setup

For production environments, ensure you set at least these required settings:

```bash
# Required for production
CONFIG_ENCRYPTION_KEY="your-secure-encryption-key"
CONFIG_HMAC_SECRET="your-secure-hmac-secret"

# Recommended security settings
CONFIG_SECURITY_CORS_ALLOWORIGIN="https://your-app.example.com"
CONFIG_LOGGING_LEVEL="error"
CONFIG_LOGGING_INCLUDETRACE="false"
```

## Troubleshooting

### Checking Current Configuration

You can check the current active configuration by calling the `/system/config` endpoint with an admin API key.

### Common Issues

1. **Configuration file not loading**: Ensure the path is correct and the file is valid JSON.
2. **Environment variables not applying**: Check for typos in variable names and ensure they have the correct `CONFIG_` prefix.
3. **Unexpected default values**: Check priority - environment variables override file values.

### Validating Configuration

All configuration is validated against a JSON schema. Invalid configurations will generate warning logs but the system will still start with default values where possible.