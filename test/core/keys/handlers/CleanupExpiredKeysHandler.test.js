import { CleanupExpiredKeysHandler } from '../../../../src/core/keys/handlers/CleanupExpiredKeysHandler.js';
import { CleanupExpiredKeysCommand } from '../../../../src/core/keys/commands/CleanupExpiredKeysCommand.js';
import { createMockKeyService, createMockAuditLogger } from '../../../utils/index.js';

describe('CleanupExpiredKeysHandler', () => {
  let handler;
  let keyService;
  let auditLogger;
  
  beforeEach(() => {
    keyService = createMockKeyService();
    auditLogger = createMockAuditLogger();
    handler = new CleanupExpiredKeysHandler(keyService, auditLogger);
  });
  
  describe('canHandle', () => {
    it('should return true for CleanupExpiredKeysCommand', () => {
      const command = new CleanupExpiredKeysCommand();
      expect(handler.canHandle(command)).toBe(true);
    });
    
    it('should return false for other commands', () => {
      const command = { constructor: { name: 'OtherCommand' } };
      expect(handler.canHandle(command)).toBe(false);
    });
  });
  
  describe('handle', () => {
    it('should call cleanupExpiredKeys on the key service', async () => {
      const command = new CleanupExpiredKeysCommand();
      const mockResult = {
        expired: 5,
        rotationsExpired: 2
      };
      
      keyService.cleanupExpiredKeys.mockResolvedValue(mockResult);
      
      const result = await handler.handle(command);
      
      expect(keyService.cleanupExpiredKeys).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
    
    it('should log the action if admin info is provided', async () => {
      const command = new CleanupExpiredKeysCommand();
      const mockResult = {
        expired: 5,
        rotationsExpired: 2
      };
      const context = { 
        adminId: 'admin-id', 
        env: { KV: {} },
        request: { headers: new Map() }
      };
      
      keyService.cleanupExpiredKeys.mockResolvedValue(mockResult);
      
      await handler.handle(command, context);
      
      expect(auditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-id',
        'system_maintenance',
        {
          operation: 'cleanup',
          keysExpired: 5,
          rotationsExpired: 2
        },
        context.env,
        context.request
      );
    });
    
    it('should not log the action if admin info is not provided', async () => {
      const command = new CleanupExpiredKeysCommand();
      const mockResult = {
        expired: 5,
        rotationsExpired: 2
      };
      
      keyService.cleanupExpiredKeys.mockResolvedValue(mockResult);
      
      await handler.handle(command, {});
      
      expect(auditLogger.logAdminAction).not.toHaveBeenCalled();
    });
    
    it('should handle missing result fields gracefully', async () => {
      const command = new CleanupExpiredKeysCommand();
      const mockResult = {}; // No expired or rotationsExpired fields
      const context = { 
        adminId: 'admin-id', 
        env: { KV: {} },
        request: { headers: new Map() }
      };
      
      keyService.cleanupExpiredKeys.mockResolvedValue(mockResult);
      
      await handler.handle(command, context);
      
      expect(auditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-id',
        'system_maintenance',
        {
          operation: 'cleanup',
          keysExpired: 0,
          rotationsExpired: 0
        },
        context.env,
        context.request
      );
    });
  });
});