# API Gateway Configuration Guide

This guide explains how to configure the API Gateway Workers using configuration files and environment variables. For a complete reference of all configuration options, see the [Configuration Reference](../reference/configuration-reference.md).

## Configuration Overview

The API Gateway Workers uses a comprehensive configuration system that supports:
- Configuration files in JSON format
- Environment variables
- OpenAPI schema validation

## Configuration Methods

### Method 1: Using a Configuration File

You can configure the API Gateway using a JSON configuration file:

```bash
# Specify configuration file path with environment variable
CONFIG_PATH=/path/to/config.json npm run dev
```

An example configuration file is provided in `config.example.json`.

### Method 2: Using Environment Variables

All configuration options can also be set via environment variables with a `CONFIG_` prefix:

```bash
# Set configuration options via environment variables
CONFIG_LOGGING_LEVEL=debug npm run dev
```

Environment variables use underscore notation and are converted to the appropriate nested configuration structure. For example:

| Environment Variable | Configuration Property |
|----------------------|------------------------|
| CONFIG_LOGGING_LEVEL | logging.level |
| CONFIG_SECURITY_CORS_ALLOW_ORIGIN | security.cors.allowOrigin |

For a complete list of environment variables, see the [Environment Variables Cheatsheet](../reference/env-vars-cheatsheet.md).

## Configuration Priority

Configuration values are resolved with the following priority (highest to lowest):
1. Environment variables with `CONFIG_` prefix
2. Values from configuration file
3. Default values from the OpenAPI schema

## Common Configuration Scenarios

### Scenario 1: Basic Setup with Debug Logging

```bash
CONFIG_LOGGING_LEVEL=debug npm run dev
```

### Scenario 2: Production Deployment

```json
// config.json
{
  "encryption": {
    "key": "your-secure-encryption-key"
  },
  "hmac": {
    "secret": "your-secure-hmac-secret"
  },
  "logging": {
    "level": "error",
    "includeTrace": false
  },
  "security": {
    "cors": {
      "allowOrigin": "https://your-domain.com"
    }
  }
}
```

### Scenario 3: API Gateway with Proxy

```json
// config.json
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

## Configuration Schema

Configuration is validated against an OpenAPI schema defined in `schemas/config.schema.json`. The schema provides validation rules, default values, and documentation for all configuration options.

## Learn More

- [Configuration Architecture](../architecture/configuration-architecture.md) - Detailed explanation of the configuration system architecture
- [Configuration Reference](../reference/configuration-reference.md) - Complete reference of all configuration options
- [Environment Variables Cheatsheet](../reference/env-vars-cheatsheet.md) - Quick reference for environment variables