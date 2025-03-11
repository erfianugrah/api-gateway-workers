// Custom test implementation of SchemaValidator
export class MockSchemaValidator {
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