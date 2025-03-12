// Mock implementation of SchemaValidator for tests
export class SchemaValidator {
  constructor(schema) {
    this.schema = schema;
  }

  validate(config) {
    return { isValid: true, errors: [] };
  }

  applyDefaults(config) {
    return { ...config, defaultsApplied: true };
  }
}
