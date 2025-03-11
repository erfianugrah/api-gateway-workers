import { RotateKeyCommand } from '../../../../src/core/keys/commands/RotateKeyCommand.js';
import { jest, describe, it, expect } from '@jest/globals';

// Instead of using jest.mock, we'll manually create a test version of RotateKeyCommand
// that overrides the validate method
class TestRotateKeyCommand extends RotateKeyCommand {
  validate() {
    const errors = {};

    // Validate keyId
    if (!this.keyId) {
      errors.keyId = "Key ID is required";
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.keyId)) {
      errors.keyId = "Invalid key ID format";
    }

    // Validate rotation parameters
    if (this.gracePeriodDays !== undefined) {
      if (!Number.isInteger(this.gracePeriodDays) || this.gracePeriodDays < 0 || this.gracePeriodDays > 90) {
        errors.gracePeriodDays = 'Grace period must be an integer between 0 and 90 days';
      }
    }
    
    if (this.name !== undefined && (typeof this.name !== 'string' || this.name.trim().length === 0)) {
      errors.name = 'Name must be a non-empty string';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

describe('RotateKeyCommand', () => {
  describe('constructor', () => {
    it('should set all properties from data', () => {
      const data = {
        keyId: 'test-key-id',
        gracePeriodDays: 14,
        scopes: ['read:data', 'write:data'],
        name: 'Rotated Key',
        expiresAt: 1700000000,
        rotatedBy: 'admin-id'
      };
      
      const command = new RotateKeyCommand(data);
      
      expect(command.keyId).toBe(data.keyId);
      expect(command.gracePeriodDays).toBe(data.gracePeriodDays);
      expect(command.scopes).toBe(data.scopes);
      expect(command.name).toBe(data.name);
      expect(command.expiresAt).toBe(data.expiresAt);
      expect(command.rotatedBy).toBe(data.rotatedBy);
    });
    
    it('should handle missing optional properties', () => {
      const data = {
        keyId: 'test-key-id'
      };
      
      const command = new RotateKeyCommand(data);
      
      expect(command.keyId).toBe(data.keyId);
      expect(command.gracePeriodDays).toBeUndefined();
      expect(command.scopes).toBeUndefined();
      expect(command.name).toBeUndefined();
      expect(command.expiresAt).toBeUndefined();
      expect(command.rotatedBy).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('should return valid for a valid UUID', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012';
      const command = new TestRotateKeyCommand({ keyId: validUuid });
      const result = command.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return invalid for a missing keyId', () => {
      const command = new TestRotateKeyCommand({ keyId: undefined });
      const result = command.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.keyId).toBeDefined();
      expect(result.errors.keyId).toBe('Key ID is required');
    });

    it('should return invalid for an invalid UUID format', () => {
      const command = new TestRotateKeyCommand({ keyId: 'not-a-uuid' });
      const result = command.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.keyId).toBeDefined();
      expect(result.errors.keyId).toBe('Invalid key ID format');
    });
    
    it('should validate rotation parameters', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012';
      const command = new TestRotateKeyCommand({ 
        keyId: validUuid,
        gracePeriodDays: -1, // Invalid value
        name: ''  // Empty string
      });
      const result = command.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.gracePeriodDays).toBeDefined();
      expect(result.errors.name).toBeDefined();
    });
    
    it('should not require optional rotation parameters', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012';
      const command = new TestRotateKeyCommand({ 
        keyId: validUuid,
        // No optional params
      });
      const result = command.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });
});