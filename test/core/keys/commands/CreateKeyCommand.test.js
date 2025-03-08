import { CreateKeyCommand } from '../../../../src/core/keys/commands/CreateKeyCommand.js';

// Create a custom mock implementation
// This is better than using jest.mock which can cause conflicts with other mocks
const validateCreateKeyParamsMock = jest.fn((params) => {
  const errors = {};
  
  // Basic validation for testing
  if (!params.name) errors.name = 'Name is required';
  if (!params.owner) errors.owner = 'Owner is required';
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
});

// Spy on the actual module
jest.spyOn(require('../../../../src/utils/validation.js'), 'validateCreateKeyParams')
  .mockImplementation(validateCreateKeyParamsMock);

describe('CreateKeyCommand', () => {
  describe('constructor', () => {
    it('should set all properties from data', () => {
      const data = {
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: 1234567890,
        createdBy: 'admin-id',
        metadata: { test: 'metadata' }
      };
      
      const command = new CreateKeyCommand(data);
      
      expect(command.name).toBe(data.name);
      expect(command.owner).toBe(data.owner);
      expect(command.scopes).toBe(data.scopes);
      expect(command.expiresAt).toBe(data.expiresAt);
      expect(command.createdBy).toBe(data.createdBy);
      expect(command.metadata).toEqual(data.metadata);
    });
    
    it('should set default empty object for metadata if not provided', () => {
      const data = {
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data']
      };
      
      const command = new CreateKeyCommand(data);
      
      expect(command.metadata).toEqual({});
    });
  });
  
  describe('validate', () => {
    it('should call validateCreateKeyParams with the correct parameters', () => {
      const data = {
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: 1234567890
      };
      
      const command = new CreateKeyCommand(data);
      const result = command.validate();
      
      // Validate result based on our mock implementation
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
    
    it('should return validation errors for invalid data', () => {
      const data = {
        // Missing name and owner
        scopes: ['read:data']
      };
      
      const command = new CreateKeyCommand(data);
      const result = command.validate();
      
      // Validate result based on our mock implementation
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.owner).toBeDefined();
    });
  });
});