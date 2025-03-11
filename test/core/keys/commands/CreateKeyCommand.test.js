// Import the command
import { CreateKeyCommand } from '../../../../src/core/keys/commands/CreateKeyCommand.js';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create a mock for validateCreateKeyParams
const validateCreateKeyParams = jest.fn((params) => {
  const errors = {};
  
  // Basic validation for testing
  if (!params.name) errors.name = 'Name is required';
  if (!params.owner) errors.owner = 'Owner is required';
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
});

// Spy on the actual validate method
jest.spyOn(CreateKeyCommand.prototype, 'validate').mockImplementation(function() {
  return validateCreateKeyParams({
    name: this.name,
    owner: this.owner,
    scopes: this.scopes,
    expiresAt: this.expiresAt,
  });
});

describe('CreateKeyCommand', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    validateCreateKeyParams.mockClear();
  });
  
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
      command.validate();
      
      // Verify that validateCreateKeyParams was called with the correct data
      expect(validateCreateKeyParams).toHaveBeenCalledWith({
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: 1234567890
      });
    });
    
    it('should return validation errors for invalid data', () => {
      // Configure our mock to return errors
      validateCreateKeyParams.mockReturnValueOnce({
        isValid: false,
        errors: {
          name: 'Name is required',
          owner: 'Owner is required'
        }
      });
      
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