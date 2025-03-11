import { describe, expect, it, beforeEach } from '@jest/globals';
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
    
    // Add spy capability to the mock keyService
    keyService.createKey = async (params) => {
      keyService.createKey.mock = {
        calls: keyService.createKey.mock?.calls || []
      };
      keyService.createKey.mock.calls.push([params]);
      
      return {
        id: 'test-key-id',
        key: 'km_test-key',
        name: params.name,
        owner: params.owner,
        scopes: params.scopes,
        status: 'active',
        createdAt: 1000000,
        expiresAt: params.expiresAt || 0,
        lastUsedAt: 0
      };
    };
    
    // Add spy capability to the audit logger
    auditLogger.logAdminAction = async (adminId, action, details, env, request) => {
      auditLogger.logAdminAction.mock = {
        calls: auditLogger.logAdminAction.mock?.calls || []
      };
      auditLogger.logAdminAction.mock.calls.push([adminId, action, details, env, request]);
      
      return "test-log-id";
    };
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
      
      const result = await handler.handle(command);
      
      expect(keyService.createKey.mock.calls[0][0]).toEqual({
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: 1234567890,
        createdBy: 'admin-id',
        metadata: { test: 'metadata' }
      });
      
      expect(result).toEqual({
        id: 'test-key-id',
        key: 'km_test-key',
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        status: 'active',
        createdAt: 1000000,
        expiresAt: 1234567890,
        lastUsedAt: 0
      });
    });
    
    it('should log the action if createdBy is provided', async () => {
      const command = new CreateKeyCommand({
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: 1234567890,
        createdBy: 'admin-id'
      });
      
      const context = {
        env: { KV: {} },
        request: { headers: new Map() }
      };
      
      await handler.handle(command, context);
      
      expect(auditLogger.logAdminAction.mock.calls[0][0]).toBe('admin-id');
      expect(auditLogger.logAdminAction.mock.calls[0][1]).toBe('create_key');
      expect(auditLogger.logAdminAction.mock.calls[0][2]).toEqual({
        keyId: 'test-key-id',
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: 1234567890
      });
      expect(auditLogger.logAdminAction.mock.calls[0][3]).toBe(context.env);
      expect(auditLogger.logAdminAction.mock.calls[0][4]).toBe(context.request);
    });
    
    it('should not log the action if createdBy is not provided', async () => {
      const command = new CreateKeyCommand({
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data']
        // No createdBy
      });
      
      await handler.handle(command, {});
      
      expect(auditLogger.logAdminAction.mock?.calls?.length || 0).toBe(0);
    });
    
    it('should handle case where expiresAt is not provided', async () => {
      const command = new CreateKeyCommand({
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        createdBy: 'admin-id'
        // No expiresAt
      });
      
      const context = {
        env: { KV: {} },
        request: { headers: new Map() }
      };
      
      await handler.handle(command, context);
      
      expect(auditLogger.logAdminAction.mock.calls[0][2]).toEqual({
        keyId: 'test-key-id',
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: 0 // Default value for missing expiresAt
      });
    });
  });
});