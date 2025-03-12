# API Gateway Configuration Guide

This guide explains how to configure the API Gateway Workers using configuration files and environment variables. 

## Configuration Overview

The API Gateway Workers uses a comprehensive configuration system that supports:
- Configuration files in JSON format
- Environment variables with `CONFIG_` prefix
- OpenAPI schema validation for type checking and defaults

## Quick Configuration Examples

### Basic Configuration

```bash
# Start with default configuration
npm run dev

# Start with debug logging
CONFIG_LOGGING_LEVEL=debug npm run dev

# Start with custom configuration file
CONFIG_PATH=./my-config.json npm run dev
```

### Production Configuration

For production, ensure you set secure values for encryption and HMAC secrets:

```bash
# Production configuration with required security settings
CONFIG_ENCRYPTION_KEY=your-secure-key CONFIG_HMAC_SECRET=your-hmac-secret npm run deploy
```

## Configuration Methods

You can configure the API Gateway using two methods:

### Method 1: Configuration File

Create a JSON file with your configuration options:

```json
{
  "logging": {
    "level": "info"
  },
  "security": {
    "cors": {
      "allowOrigin": "https://example.com"
    }
  }
}
```

Then specify the file path when starting the application:

```bash
CONFIG_PATH=./config.json npm run dev
```

### Method 2: Environment Variables

Set configuration options directly using environment variables:

```bash
CONFIG_LOGGING_LEVEL=debug CONFIG_SECURITY_CORS_ALLOWORIGIN=https://example.com npm run dev
```

## Configuration Priorities

When the same configuration option is set in multiple places, the system uses the following priority order (highest first):

1. Environment variables with `CONFIG_` prefix
2. Configuration file specified by CONFIG_PATH
3. Default values from the OpenAPI schema

This means environment variables will override values from the configuration file, which will override default values.

## Common Configuration Examples

### Configuring Logging

```json
{
  "logging": {
    "level": "debug",
    "includeTrace": true,
    "requestIdHeader": "X-Request-ID"
  }
}
```

Environment variables:
```bash
CONFIG_LOGGING_LEVEL=debug
CONFIG_LOGGING_INCLUDETRACE=true
CONFIG_LOGGING_REQUESTIDHEADER=X-Request-ID
```

### Configuring CORS

```json
{
  "security": {
    "cors": {
      "allowOrigin": "https://example.com",
      "allowMethods": "GET,POST,PUT,DELETE,OPTIONS",
      "allowHeaders": "Content-Type,Authorization,X-API-Key"
    }
  }
}
```

Environment variables:
```bash
CONFIG_SECURITY_CORS_ALLOWORIGIN=https://example.com
CONFIG_SECURITY_CORS_ALLOWMETHODS=GET,POST,PUT,DELETE,OPTIONS
CONFIG_SECURITY_CORS_ALLOWHEADERS=Content-Type,Authorization,X-API-Key
```

### Configuring API Versioning

```json
{
  "routing": {
    "versioning": {
      "enabled": true,
      "current": "2",
      "supported": ["1", "2"],
      "deprecated": ["1"],
      "versionHeader": "X-API-Version"
    }
  }
}
```

Environment variables:
```bash
CONFIG_ROUTING_VERSIONING_ENABLED=true
CONFIG_ROUTING_VERSIONING_CURRENT=2
CONFIG_ROUTING_VERSIONING_SUPPORTED=1,2
CONFIG_ROUTING_VERSIONING_DEPRECATED=1
CONFIG_ROUTING_VERSIONING_VERSIONHEADER=X-API-Version
```

### Configuring Proxy Services

```json
{
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

Environment variables for proxy services are more complex. For the services object, you can use:
```bash
CONFIG_PROXY_SERVICES='{"userService":{"url":"https://users-api.example.com","timeout":5000},"orderService":{"url":"https://orders-api.example.com","timeout":10000}}'
```

## Configuration Schema Validation

The configuration system validates all settings against an OpenAPI schema defined in `schemas/config.schema.json`. This ensures:

1. Type safety for all configuration values
2. Default values when not specified
3. Validation of value constraints (e.g., minimum/maximum values)
4. Documentation for each configuration option

If the configuration fails validation, the application will log errors and may not start correctly.

## Troubleshooting Configuration Issues

### Configuration Not Applied

If your configuration isn't being applied as expected:

1. Check environment variable names (should be prefixed with `CONFIG_` and use uppercase)
2. Verify the configuration file path is correct
3. Look for validation errors in the logs

### Schema Validation Errors

Schema validation errors will appear in the logs with details about the specific issue. Common issues include:

- Type mismatches (e.g., string instead of number)
- Values outside of allowed ranges
- Missing required properties

## Next Steps

- See the [Configuration Reference](../reference/configuration-reference.md) for all available options
- Check the [Environment Variables Cheatsheet](../reference/env-vars-cheatsheet.md) for a quick overview
- Learn about the [API Gateway Architecture](../architecture/overview.md) to understand how configuration is used