# Contributing to API Key Manager

We welcome contributions to the API Key Manager project! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We value a diverse and inclusive community.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment:
   ```bash
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Local Development

Start a local development server:
```bash
npm run dev
```

The server will be available at http://localhost:8787.

### Testing

Run all tests:
```bash
npm test
```

Run integration tests:
```bash
npm run test:integration
```

Generate test coverage report:
```bash
npm run test:coverage
```

### Coding Standards

- All code should be formatted with Prettier using the project's configuration
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Write comments for complex logic
- Keep functions small and focused

## Pull Request Process

1. Update the documentation to reflect any changes
2. Ensure all tests pass successfully
3. Add tests for new functionality
4. Make sure your code follows the project's coding standards
5. Squash multiple commits into a single meaningful commit
6. Create a pull request with a clear description of the changes
7. Reference any relevant issues in the pull request

## Security Considerations

- API keys are security-critical; handle with care
- Never log or expose API key values
- Avoid shortcuts in validation or security checks
- Always sanitize user inputs
- Consider rate limiting for public endpoints
- Validate all inputs thoroughly
- Use cryptographically secure random number generation

## Testing Guidelines

### Unit Tests

- Write tests for all new functionality
- Test both success and failure cases
- Mock external dependencies
- Focus on testing behavior, not implementation details
- Keep tests independent of each other

### Advanced Security Tests

- Test for edge cases like extremely long inputs
- Test concurrent operations for race conditions
- Test error handling under failure scenarios
- Test security features like rate limiting isolation
- Validate cryptographic security

### Integration Tests

- Test the full API flow
- Verify HTTP status codes and response formats
- Test with real data and storage
- Validate error handling
- Test security features like rate limiting and key expiration

## Documentation Guidelines

When making changes, update the relevant documentation:

- API.md - API endpoints and request/response formats
- ARCHITECTURE.md - System architecture and component design
- SECURITY.md - Security implementation details
- README.md - General project information and quick start

## Project Structure

The project has the following structure:

```
key-manager-workers/
├── src/                  # Source code
│   ├── handlers/         # API route handlers
│   ├── lib/              # Core functionality
│   ├── models/           # Business logic and data models
│   ├── utils/            # Utility functions
│   └── index.js          # Entry point
├── test/                 # Test suite
│   ├── lib/              # Core functionality tests
│   ├── models/           # Business logic tests
│   ├── utils/            # Utility tests
│   └── integration-test.sh # Integration tests
├── docs/                 # Documentation
│   ├── API.md            # API documentation
│   ├── ARCHITECTURE.md   # Architecture documentation
│   └── SECURITY.md       # Security implementation details
└── wrangler.jsonc        # Cloudflare Workers configuration
```

## Release Process

1. Update version number in package.json
2. Update CHANGELOG.md with the changes in the new version
3. Create a tag for the new version
4. Deploy to production using `npm run deploy`

## Getting Help

If you need help with contributing, please open an issue with the "question" label.

Thank you for contributing to the API Key Manager project!