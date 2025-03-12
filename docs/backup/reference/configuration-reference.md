# API Gateway Configuration Reference

This document provides a complete reference of all configuration options available in the API Gateway Workers. For a user-friendly guide on how to configure the system, see the [Configuration Guide](../guides/configuration-guide.md).

## Configuration System Overview

The API Gateway Workers uses a comprehensive configuration system that includes:

- Configuration loading from multiple sources
- OpenAPI schema validation
- Hierarchical configuration structure
- Environment variable mapping

## Configuration Sources

Configuration is loaded from the following sources, in order of priority (highest first):

1. Environment variables with `CONFIG_` prefix
2. Configuration file specified by CONFIG_PATH
3. Default values from the OpenAPI schema

## Configuration Schema

All configuration options are validated against an OpenAPI schema defined in `schemas/config.schema.json`. This provides:

- Type validation
- Default values
- Documentation
- Value constraints

## Configuration Options Reference

### Core Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `encryption.key` | string | None | Secret key for encrypting API keys at rest (required in production) |
| `hmac.secret` | string | None | Secret for generating HMAC signatures (required in production) |

### Logging Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logging.level` | string | "error" in production, "info" in development | Logging verbosity level: "error", "warn", "info", "debug", "trace" |
| `logging.includeTrace` | boolean | false in production | Include stack traces in error logs |
| `logging.requestIdHeader` | string | "X-Request-ID" | Header to extract request ID from |

### Security Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `security.cors.allowOrigin` | string | "*" | Value for Access-Control-Allow-Origin header |
| `security.cors.allowMethods` | string | "GET,POST,PUT,DELETE,OPTIONS" | Value for Access-Control-Allow-Methods header |
| `security.cors.allowHeaders` | string | "Content-Type,Authorization,X-API-Key" | Value for Access-Control-Allow-Headers header |
| `security.apiKeyHeader` | string | "X-API-Key" | Header name for API key authentication |

### API Versioning Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `routing.versioning.enabled` | boolean | true | Enable/disable API versioning |
| `routing.versioning.current` | string | "1" | Current API version |
| `routing.versioning.supported` | array | ["1"] | Array of supported versions |
| `routing.versioning.deprecated` | array | [] | Array of deprecated versions |
| `routing.versioning.versionHeader` | string | "X-API-Version" | Header for API version |

### Proxy Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `proxy.enabled` | boolean | false | Enable/disable proxy functionality |
| `proxy.timeout` | number | 30000 | Default timeout in milliseconds for proxied requests |
| `proxy.retry.enabled` | boolean | true | Enable/disable retry mechanism |
| `proxy.retry.maxAttempts` | number | 3 | Maximum retry attempts |
| `proxy.circuitBreaker.enabled` | boolean | true | Enable/disable circuit breaker |
| `proxy.services` | object | {} | Object defining upstream services for proxying |

## Environment Variable Mapping

Environment variables are mapped to configuration properties using the following convention:

1. Prefix all variables with `CONFIG_`
2. Replace dots with underscores
3. Convert to uppercase

Examples:

| Configuration Property | Environment Variable |
|------------------------|----------------------|
| `logging.level` | `CONFIG_LOGGING_LEVEL` |
| `security.cors.allowOrigin` | `CONFIG_SECURITY_CORS_ALLOWORIGIN` |
| `proxy.retry.maxAttempts` | `CONFIG_PROXY_RETRY_MAXATTEMPTS` |

For a complete list of environment variables, see the [Environment Variables Cheatsheet](../reference/env-vars-cheatsheet.md).

## Configuration File Format

Example configuration file (`config.json`):

```json
{
  "encryption": {
    "key": "your-secure-encryption-key"
  },
  "hmac": {
    "secret": "your-secure-hmac-secret"
  },
  "logging": {
    "level": "info",
    "includeTrace": true,
    "requestIdHeader": "X-Request-ID"
  },
  "security": {
    "cors": {
      "allowOrigin": "https://example.com",
      "allowMethods": "GET,POST,PUT,DELETE,OPTIONS",
      "allowHeaders": "Content-Type,Authorization,X-API-Key,X-Request-ID"
    },
    "apiKeyHeader": "X-API-Key"
  },
  "routing": {
    "versioning": {
      "enabled": true,
      "current": "2",
      "supported": ["1", "2"],
      "deprecated": ["1"],
      "versionHeader": "X-API-Version"
    }
  },
  "proxy": {
    "enabled": true,
    "timeout": 30000,
    "retry": {
      "enabled": true,
      "maxAttempts": 3
    },
    "circuitBreaker": {
      "enabled": true
    },
    "services": {
      "userService": {
        "url": "https://users-api.example.com",
        "timeout": 5000
      },
      "orderService": {
        "url": "https://orders-api.example.com",
        "timeout": 10000
      }
    }
  }
}
```

## See Also

- [Configuration Guide](../guides/configuration-guide.md) - User-friendly configuration guide
- [Environment Variables Cheatsheet](../reference/env-vars-cheatsheet.md) - Quick reference for environment variables
- [Architecture: Configuration System](../architecture/configuration-architecture.md) - Details about the configuration system implementation