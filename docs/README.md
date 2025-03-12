# API Gateway Documentation

Welcome to the API Gateway documentation. This documentation will help you understand and use the API Gateway service effectively.

## Table of Contents

- [Configuration Guide](./configuration.md) - Comprehensive guide to all configuration options
- [API Reference](./api-reference.md) - API endpoints and authentication
- [Gateway Features](./gateway-features.md) - Details on proxy, routing and other gateway features
- [Key Management](./key-management.md) - Managing API keys and permissions

## Getting Started

The API Gateway provides a secure, scalable gateway service built on Cloudflare Workers.

### Key Features

- Secure API key management (generation, validation, rotation)
- Permission-based scopes for fine-grained access control
- API proxying with request routing and retry mechanisms
- Circuit breaker pattern for fault tolerance
- API versioning and parameter validation
- Comprehensive configuration system

## Configuration

The API Gateway uses a flexible configuration system with multiple layers:

1. Default values built into the system
2. Configuration files in JSON format
3. Environment variables with `CONFIG_` prefix

This layered approach allows for maximum flexibility across development and production environments.

For a complete reference of all available configuration options, see the [Configuration Guide](./configuration.md).

### Quick Configuration Example

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

You can specify your configuration in a file:

```bash
CONFIG_PATH=./config.json npm run dev
```

Or use environment variables:

```bash
export CONFIG_ENCRYPTION_KEY="your-secure-encryption-key"
export CONFIG_HMAC_SECRET="your-secure-hmac-secret"
export CONFIG_SECURITY_CORS_ALLOWORIGIN="https://your-app.example.com"
npm run dev
```

## Recent Configuration System Improvements

The configuration system has been enhanced with the following improvements:

1. **Full Schema Validation** - All configuration is validated against an OpenAPI schema
2. **Enhanced Environment Variables** - Support for complex objects through environment variables
3. **Better Defaults** - Sensible defaults for all configuration options
4. **Improved Documentation** - Comprehensive configuration reference
5. **Special Case Handling** - Support for configuring complex structures like proxy services
6. **Backward Compatibility** - Support for legacy environment variables

These improvements make the configuration system more flexible and easier to use across different deployment environments.