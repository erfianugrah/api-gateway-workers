import { ListKeysHandler } from '../../../../src/core/keys/handlers/ListKeysHandler.js';
import { ListKeysCommand } from '../../../../src/core/keys/commands/ListKeysCommand.js';
import { createMockKeyService, createMockAuditLogger } from '../../../utils/index.js';

describe('ListKeysHandler', () => {
  let handler;
  let keyService;
  let auditLogger;
  
  beforeEach(() => {
    keyService = createMockKeyService();
    auditLogger = createMockAuditLogger();
    handler = new ListKeysHandler(keyService, auditLogger);
  });
  
  describe('canHandle', () => {
    it('should return true for ListKeysCommand', () => {
      const command = new ListKeysCommand();
      expect(handler.canHandle(command)).toBe(true);
    });
    
    it('should return false for other commands', () => {
      const command = { constructor: { name: 'OtherCommand' } };
      expect(handler.canHandle(command)).toBe(false);
    });
  });
  
  describe('handle', () => {
    it('should retrieve keys from the key service with correct pagination', async () => {
      const command = new ListKeysCommand({ limit: 20, offset: 40 });
      const mockResult = {
        items: [
          { id: 'key1', name: 'Key 1' },
          { id: 'key2', name: 'Key 2' }
        ],
        totalItems: 100,
        limit: 20,
        offset: 40
      };
      
      keyService.listKeys.mockResolvedValue(mockResult);
      
      const result = await handler.handle(command);
      
      expect(keyService.listKeys).toHaveBeenCalledWith({
        limit: 20,
        offset: 40
      });
      expect(result).toEqual(mockResult);
    });
    
    it('should use default values when not specified', async () => {
      const command = new ListKeysCommand();
      
      await handler.handle(command);
      
      expect(keyService.listKeys).toHaveBeenCalledWith({
        limit: 100,
        offset: 0
      });
    });
    
    it('should log the action if admin info is provided', async () => {
      const command = new ListKeysCommand({ limit: 10, offset: 0 });
      const mockResult = {
        items: [],
        totalItems: 50,
        limit: 10,
        offset: 0
      };
      const context = { 
        adminId: 'admin-id', 
        env: { KV: {} },
        request: { headers: new Map() }
      };
      
      keyService.listKeys.mockResolvedValue(mockResult);
      
      await handler.handle(command, context);
      
      expect(auditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-id',
        'list_keys',
        {
          limit: 10,
          offset: 0,
          totalItems: 50
        },
        context.env,
        context.request
      );
    });
    
    it('should not log the action if admin info is not provided', async () => {
      const command = new ListKeysCommand();
      const mockResult = {
        items: [],
        totalItems: 0,
        limit: 100,
        offset: 0
      };
      
      keyService.listKeys.mockResolvedValue(mockResult);
      
      await handler.handle(command, {});
      
      expect(auditLogger.logAdminAction).not.toHaveBeenCalled();
    });
  });
});