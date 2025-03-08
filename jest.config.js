export default {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageReporters: ['text', 'lcov'],
  testTimeout: 10000, // Cloudflare Workers tests may take some time
  setupFilesAfterEnv: ['./test/jest-setup.js'],
  transform: {}, // Don't transform files (use ESM)
  moduleNameMapper: {
    "cloudflare:workers": "<rootDir>/test/cloudflare-mock.js",
    "^../../src/auth/keyValidator.js$": "<rootDir>/test/mocks/src/auth/keyValidator.js",
    "^../../src/auth/keyGenerator.js$": "<rootDir>/test/mocks/src/auth/keyGenerator.js",
    "^../../src/core/auth/adapters/ApiKeyAdapter.js$": "<rootDir>/test/mocks/src/core/auth/adapters/ApiKeyAdapter.js"
  }
};