import { RevokeKeyHandler } from '../../../../src/core/keys/handlers/RevokeKeyHandler.js';
import { RevokeKeyCommand } from '../../../../src/core/keys/commands/RevokeKeyCommand.js';
import { NotFoundError } from '../../../../src/core/errors/ApiError.js';
import { createMockKeyService, createMockAuditLogger } from '../../../utils/index.js';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('RevokeKeyHandler', () => {
  let handler;
  let keyService;
  let auditLogger;
  
  beforeEach(() => {
    keyService = createMockKeyService();
    auditLogger = createMockAuditLogger();
    handler = new RevokeKeyHandler(keyService, auditLogger);
    
    // Set up specific mock for revokeKey
    keyService.revokeKey.mockImplementation((keyId, reason, revokedBy) => {
      if (keyId === 'not-found-key') {
        return Promise.resolve({
          success: false,
          error: 'API key not found'
        });
      }
      if (keyId === 'error-key') {
        return Promise.resolve({
          success: false,
          error: 'Internal error'
        });
      }
      return Promise.resolve({
        success: true,
        message: 'API key revoked successfully',
        id: keyId,
        name: 'Test Key',
        revokedAt: 1000000,
        reason: reason
      });
    });
  });
  
  describe('canHandle', () => {
    it('should return true for RevokeKeyCommand', () => {
      const command = new RevokeKeyCommand({ keyId: 'test-key-id' });
      expect(handler.canHandle(command)).toBe(true);
    });
    
    it('should return false for other commands', () => {
      const command = { constructor: { name: 'OtherCommand' } };
      expect(handler.canHandle(command)).toBe(false);
    });
  });
  
  describe('handle', () => {
    it('should revoke the key using the key service', async () => {
      const command = new RevokeKeyCommand({ 
        keyId: 'test-key-id',
        reason: 'Security breach',
        revokedBy: 'admin-id'
      });
      
      const result = await handler.handle(command);
      
      expect(keyService.revokeKey).toHaveBeenCalledWith(
        'test-key-id',
        'Security breach',
        'admin-id'
      );
      
      expect(result).toEqual({
        success: true,
        message: 'API key revoked successfully',
        id: 'test-key-id',
        name: 'Test Key',
        revokedAt: 1000000,
        reason: 'Security breach'
      });
    });
    
    it('should use default reason if none provided', async () => {
      const command = new RevokeKeyCommand({ 
        keyId: 'test-key-id',
        revokedBy: 'admin-id'
      });
      
      await handler.handle(command);
      
      expect(keyService.revokeKey).toHaveBeenCalledWith(
        'test-key-id',
        'Administrative action',
        'admin-id'
      );
    });
    
    it('should throw NotFoundError if key does not exist', async () => {
      const command = new RevokeKeyCommand({ 
        keyId: 'not-found-key',
        revokedBy: 'admin-id'
      });
      
      await expect(handler.handle(command)).rejects.toThrow(NotFoundError);
    });
    
    it('should throw Error with the error message for other errors', async () => {
      const command = new RevokeKeyCommand({ 
        keyId: 'error-key',
        revokedBy: 'admin-id'
      });
      
      await expect(handler.handle(command)).rejects.toThrow('Internal error');
    });
    
    it('should log the action if revokedBy is provided', async () => {
      const command = new RevokeKeyCommand({ 
        keyId: 'test-key-id',
        reason: 'Security breach',
        revokedBy: 'admin-id'
      });
      
      const context = { 
        env: { KV: {} },
        request: { headers: new Map() }
      };
      
      await handler.handle(command, context);
      
      expect(auditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-id',
        'revoke_key',
        { 
          keyId: 'test-key-id',
          reason: 'Security breach'
        },
        context.env,
        context.request
      );
    });
    
    it('should not log the action if revokedBy is not provided', async () => {
      const command = new RevokeKeyCommand({ 
        keyId: 'test-key-id',
        reason: 'Security breach'
      });
      
      await handler.handle(command, {});
      
      expect(auditLogger.logAdminAction).not.toHaveBeenCalled();
    });
    
    it('should handle missing auditLogger gracefully', async () => {
      // Create handler with no audit logger
      const handlerWithoutLogger = new RevokeKeyHandler(keyService);
      
      const command = new RevokeKeyCommand({ 
        keyId: 'test-key-id',
        reason: 'Security breach',
        revokedBy: 'admin-id'
      });
      
      // This should not throw an error
      const result = await handlerWithoutLogger.handle(command, {});
      
      expect(result.success).toBe(true);
    });
  });
});