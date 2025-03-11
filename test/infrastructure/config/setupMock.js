// Set up manual mock for SchemaValidator
jest.mock('../../../src/infrastructure/config/SchemaValidator.js', () => {
  return {
    SchemaValidator: jest.fn().mockImplementation(() => ({
      validate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
      applyDefaults: jest.fn(config => ({ ...config, defaultsApplied: true }))
    }))
  };
});