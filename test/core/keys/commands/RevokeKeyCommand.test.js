import { RevokeKeyCommand } from '../../../../src/core/keys/commands/RevokeKeyCommand.js';
import { jest, describe, it, expect } from '@jest/globals';

describe('RevokeKeyCommand', () => {
  describe('constructor', () => {
    it('should set all properties from data', () => {
      const data = {
        keyId: 'test-key-id',
        reason: 'Security breach',
        revokedBy: 'admin-id'
      };
      
      const command = new RevokeKeyCommand(data);
      
      expect(command.keyId).toBe(data.keyId);
      expect(command.reason).toBe(data.reason);
      expect(command.revokedBy).toBe(data.revokedBy);
    });
    
    it('should handle missing optional properties', () => {
      const data = {
        keyId: 'test-key-id'
      };
      
      const command = new RevokeKeyCommand(data);
      
      expect(command.keyId).toBe(data.keyId);
      expect(command.reason).toBeUndefined();
      expect(command.revokedBy).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('should return valid for a valid UUID', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012';
      const command = new RevokeKeyCommand({ keyId: validUuid });
      const result = command.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return invalid for a missing keyId', () => {
      const command = new RevokeKeyCommand({ keyId: undefined });
      const result = command.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.keyId).toBeDefined();
      expect(result.errors.keyId).toBe('Key ID is required');
    });

    it('should return invalid for an invalid UUID format', () => {
      const command = new RevokeKeyCommand({ keyId: 'not-a-uuid' });
      const result = command.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.keyId).toBeDefined();
      expect(result.errors.keyId).toBe('Invalid key ID format');
    });
    
    it('should not require reason or revokedBy', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012';
      const command = new RevokeKeyCommand({ 
        keyId: validUuid,
        // No reason or revokedBy
      });
      const result = command.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });
});