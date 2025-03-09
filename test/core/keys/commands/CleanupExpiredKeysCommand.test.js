import { CleanupExpiredKeysCommand } from '../../../../src/core/keys/commands/CleanupExpiredKeysCommand.js';

describe('CleanupExpiredKeysCommand', () => {
  describe('constructor', () => {
    it('should create a valid command instance', () => {
      const command = new CleanupExpiredKeysCommand();
      expect(command).toBeInstanceOf(CleanupExpiredKeysCommand);
    });
  });

  describe('validate', () => {
    it('should always return valid since there are no parameters to validate', () => {
      const command = new CleanupExpiredKeysCommand();
      const result = command.validate();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });
});