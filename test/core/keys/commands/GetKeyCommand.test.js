import { GetKeyCommand } from '../../../../src/core/keys/commands/GetKeyCommand.js';

describe('GetKeyCommand', () => {
  describe('constructor', () => {
    it('should set the keyId property', () => {
      const command = new GetKeyCommand({ keyId: 'test-key-id' });
      expect(command.keyId).toBe('test-key-id');
    });
  });

  describe('validate', () => {
    it('should return valid for a valid UUID', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012';
      const command = new GetKeyCommand({ keyId: validUuid });
      const result = command.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return invalid for a missing keyId', () => {
      const command = new GetKeyCommand({ keyId: undefined });
      const result = command.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.keyId).toBeDefined();
    });

    it('should return invalid for an invalid UUID format', () => {
      const command = new GetKeyCommand({ keyId: 'not-a-uuid' });
      const result = command.validate();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.keyId).toBeDefined();
    });
  });
});