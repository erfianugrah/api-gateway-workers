# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- API Gateway functionality with enhanced routing capabilities
- Regex-based route pattern matching with validation
- Parameter validation for path segments
- API versioning support with configuration-driven version management
- Proxy functionality for forwarding requests to upstream services
- Circuit breaker pattern for fault tolerance
- Retry mechanisms with configurable backoff
- Path rewriting and transformation for proxied requests
- Header manipulation capabilities for proxied requests
- Timeout management with request cancellation
- RevokeKey and RotateKey command/handler implementations
- Comprehensive documentation in docs/ directory
- API reference documentation including gateway features
- Security implementation details
- Architecture documentation
- Quick start guide
- Contributing guidelines
- Command pattern implementation with dedicated command objects and handlers
- Clean architecture implementation with clear layers (domain, application, infrastructure, API)
- Comprehensive test utilities package
- Dedicated test files for admin management functions
- Error handling for storage operations and validation
- Enhanced configuration system with OpenAPI schema validation
- Configuration loading from files and environment variables
- Example configuration files with documentation

### Fixed
- IP address extraction security vulnerability
- Improved rate limiting implementation
- Fixed expiration handling for API keys
- Concurrent operation safety improvements
- Enhanced input validation
- Fixed all test configurations and mocking approaches
- Fixed admin key management error handling
- Addressed storage error handling

### Changed
- Better organization of project structure
- Updated README with more comprehensive information
- Improved error handling across the application
- Refactored to clean architecture with distinct layers
- Enhanced admin management with better error handling
- Moved to command pattern for business logic organization
- Improved test coverage (264 passing tests)
- Improved configuration flexibility with layered configuration system
- Enhanced documentation with configuration examples and schema details

## [1.0.0] - 2023-12-15

### Added
- Initial release
- API key creation, listing, retrieval, and revocation
- Key validation with scope checking
- Key expiration support
- Rate limiting
- Durable Object storage
- Integration tests
- Unit tests for all components