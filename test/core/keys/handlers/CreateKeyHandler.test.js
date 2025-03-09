import { CreateKeyHandler } from '../../../../src/core/keys/handlers/CreateKeyHandler.js';
import { CreateKeyCommand } from '../../../../src/core/keys/commands/CreateKeyCommand.js';
import { createMockKeyService, createMockAuditLogger } from '../../../utils/index.js';

describe('CreateKeyHandler', () => {
  let handler;
  let keyService;
  let auditLogger;
  
  beforeEach(() => {
    keyService = createMockKeyService();
    auditLogger = createMockAuditLogger();
    handler = new CreateKeyHandler(keyService, auditLogger);
  });
  
  describe('canHandle', () => {
    it('should return true for CreateKeyCommand', () => {
      const command = new CreateKeyCommand({
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data']
      });
      expect(handler.canHandle(command)).toBe(true);
    });
    
    it('should return false for other commands', () => {
      const command = { constructor: { name: 'OtherCommand' } };
      expect(handler.canHandle(command)).toBe(false);
    });
  });
  
  describe('handle', () => {
    it('should call createKey on keyService with correct parameters', async () => {
      const command = new CreateKeyCommand({
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: 1234567890,
        createdBy: 'admin-id',
        metadata: { test: 'metadata' }
      });
      
      const mockApiKey = {
        id: 'test-key-id',
        key: 'km_test-key',
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        status: 'active',
        createdAt: 1000000,
        expiresAt: 1234567890,
        lastUsedAt: 0
      };
      
      keyService.createKey.mockResolvedValue(mockApiKey);
      
      const result = await handler.handle(command);
      
      expect(keyService.createKey).toHaveBeenCalledWith({
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: 1234567890,
        createdBy: 'admin-id',
        metadata: { test: 'metadata' }
      });
      
      expect(result).toEqual(mockApiKey);
    });
    
    it('should log the action if createdBy is provided', async () => {
      const command = new CreateKeyCommand({
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: 1234567890,
        createdBy: 'admin-id'
      });
      
      const mockApiKey = {
        id: 'test-key-id',
        key: 'km_test-key',
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        status: 'active',
        createdAt: 1000000,
        expiresAt: 1234567890,
        lastUsedAt: 0
      };
      
      const context = {
        env: { KV: {} },
        request: { headers: new Map() }
      };
      
      keyService.createKey.mockResolvedValue(mockApiKey);
      
      await handler.handle(command, context);
      
      expect(auditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-id',
        'create_key',
        {
          keyId: 'test-key-id',
          name: 'Test Key',
          owner: 'test@example.com',
          scopes: ['read:data'],
          expiresAt: 1234567890
        },
        context.env,
        context.request
      );
    });
    
    it('should not log the action if createdBy is not provided', async () => {
      const command = new CreateKeyCommand({
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data']
        // No createdBy
      });
      
      const mockApiKey = {
        id: 'test-key-id',
        key: 'km_test-key',
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        status: 'active',
        createdAt: 1000000,
        expiresAt: 0,
        lastUsedAt: 0
      };
      
      keyService.createKey.mockResolvedValue(mockApiKey);
      
      await handler.handle(command, {});
      
      expect(auditLogger.logAdminAction).not.toHaveBeenCalled();
    });
    
    it('should handle case where expiresAt is not provided', async () => {
      const command = new CreateKeyCommand({
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        createdBy: 'admin-id'
        // No expiresAt
      });
      
      const mockApiKey = {
        id: 'test-key-id',
        key: 'km_test-key',
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        status: 'active',
        createdAt: 1000000,
        expiresAt: 0,
        lastUsedAt: 0
      };
      
      const context = {
        env: { KV: {} },
        request: { headers: new Map() }
      };
      
      keyService.createKey.mockResolvedValue(mockApiKey);
      
      await handler.handle(command, context);
      
      expect(auditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-id',
        'create_key',
        {
          keyId: 'test-key-id',
          name: 'Test Key',
          owner: 'test@example.com',
          scopes: ['read:data'],
          expiresAt: 0 // Default value for missing expiresAt
        },
        context.env,
        context.request
      );
    });
  });
});