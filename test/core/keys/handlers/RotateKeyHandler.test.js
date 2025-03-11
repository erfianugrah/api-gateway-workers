import { RotateKeyHandler } from '../../../../src/core/keys/handlers/RotateKeyHandler.js';
import { RotateKeyCommand } from '../../../../src/core/keys/commands/RotateKeyCommand.js';
import { NotFoundError } from '../../../../src/core/errors/ApiError.js';
import { createMockKeyService, createMockAuditLogger } from '../../../utils/index.js';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('RotateKeyHandler', () => {
  let handler;
  let keyService;
  let auditLogger;
  
  beforeEach(() => {
    keyService = createMockKeyService();
    auditLogger = createMockAuditLogger();
    handler = new RotateKeyHandler(keyService, auditLogger);
    
    // Set up specific mock for rotateKey
    keyService.rotateKey.mockImplementation((keyId, options) => {
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
        message: 'API key rotated successfully',
        originalKey: { 
          id: keyId, 
          status: 'rotated',
          name: options.name || 'Original Key' 
        },
        newKey: { 
          id: 'new-key-id', 
          key: 'km_new-key', 
          status: 'active',
          name: options.name || 'Original Key' 
        },
        gracePeriodDays: options.gracePeriodDays || 7
      });
    });
  });
  
  describe('canHandle', () => {
    it('should return true for RotateKeyCommand', () => {
      const command = new RotateKeyCommand({ keyId: 'test-key-id' });
      expect(handler.canHandle(command)).toBe(true);
    });
    
    it('should return false for other commands', () => {
      const command = { constructor: { name: 'OtherCommand' } };
      expect(handler.canHandle(command)).toBe(false);
    });
  });
  
  describe('handle', () => {
    it('should rotate the key using the key service with all parameters', async () => {
      const command = new RotateKeyCommand({ 
        keyId: 'test-key-id',
        gracePeriodDays: 14,
        scopes: ['read:data', 'write:data'],
        name: 'Rotated Key',
        expiresAt: 1700000000,
        rotatedBy: 'admin-id'
      });
      
      const result = await handler.handle(command);
      
      expect(keyService.rotateKey).toHaveBeenCalledWith(
        'test-key-id',
        {
          gracePeriodDays: 14,
          scopes: ['read:data', 'write:data'],
          name: 'Rotated Key',
          expiresAt: 1700000000,
          rotatedBy: 'admin-id'
        }
      );
      
      expect(result.success).toBe(true);
      expect(result.originalKey.id).toBe('test-key-id');
      expect(result.originalKey.status).toBe('rotated');
      expect(result.newKey.id).toBe('new-key-id');
      expect(result.newKey.status).toBe('active');
    });
    
    it('should rotate the key with minimal parameters', async () => {
      const command = new RotateKeyCommand({ 
        keyId: 'test-key-id'
      });
      
      await handler.handle(command);
      
      expect(keyService.rotateKey).toHaveBeenCalledWith(
        'test-key-id',
        {
          gracePeriodDays: undefined,
          scopes: undefined,
          name: undefined,
          expiresAt: undefined,
          rotatedBy: undefined
        }
      );
    });
    
    it('should throw NotFoundError if key does not exist', async () => {
      const command = new RotateKeyCommand({ 
        keyId: 'not-found-key',
        rotatedBy: 'admin-id'
      });
      
      await expect(handler.handle(command)).rejects.toThrow(NotFoundError);
    });
    
    it('should throw Error with the error message for other errors', async () => {
      const command = new RotateKeyCommand({ 
        keyId: 'error-key',
        rotatedBy: 'admin-id'
      });
      
      await expect(handler.handle(command)).rejects.toThrow('Internal error');
    });
    
    it('should log the action if rotatedBy is provided', async () => {
      const command = new RotateKeyCommand({ 
        keyId: 'test-key-id',
        gracePeriodDays: 14,
        rotatedBy: 'admin-id'
      });
      
      const context = { 
        env: { KV: {} },
        request: { headers: new Map() }
      };
      
      await handler.handle(command, context);
      
      expect(auditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-id',
        'rotate_key',
        { 
          keyId: 'test-key-id',
          newKeyId: 'new-key-id',
          gracePeriodDays: 14
        },
        context.env,
        context.request
      );
    });
    
    it('should not log the action if rotatedBy is not provided', async () => {
      const command = new RotateKeyCommand({ 
        keyId: 'test-key-id',
        gracePeriodDays: 14
      });
      
      await handler.handle(command, {});
      
      expect(auditLogger.logAdminAction).not.toHaveBeenCalled();
    });
    
    it('should handle missing auditLogger gracefully', async () => {
      // Create handler with no audit logger
      const handlerWithoutLogger = new RotateKeyHandler(keyService);
      
      const command = new RotateKeyCommand({ 
        keyId: 'test-key-id',
        gracePeriodDays: 14,
        rotatedBy: 'admin-id'
      });
      
      // This should not throw an error
      const result = await handlerWithoutLogger.handle(command, {});
      
      expect(result.success).toBe(true);
    });
  });
});