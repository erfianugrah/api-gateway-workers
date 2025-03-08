import { ValidationController } from '../../../src/api/controllers/ValidationController.js';
import { 
  TestContainer,
  createMockRequest,
  createMockContext,
  setupTestEnvironment
} from '../../utils/index.js';

// Mock the validation function
jest.mock('../../../src/utils/validation.js', () => ({
  isValidApiKey: jest.fn(key => key.startsWith('km_')),
  // Add any other exports from the validation module that might be needed
}));

describe('ValidationController', () => {
  let { container, teardown } = setupTestEnvironment();
  let controller;
  
  beforeEach(() => {
    controller = new ValidationController({
      commandBus: container.resolve('commandBus')
    });
  });
  
  afterEach(() => {
    teardown();
  });
  
  describe('validateKey', () => {
    it('should validate a key provided in X-API-Key header', async () => {
      // Prepare a mock successful validation result
      const validationResult = {
        valid: true,
        keyId: 'test-key-id',
        scopes: ['read:data', 'write:data'],
        owner: 'test@example.com'
      };
      
      container.resolve('commandBus').execute.mockResolvedValue(validationResult);
      
      // Create a request with API key in header
      const request = createMockRequest({
        method: 'POST',
        headers: { 'X-API-Key': 'km_test-key-0123456789' },
        body: { scopes: ['read:data'] }
      });
      
      const context = createMockContext();
      
      // Call controller
      const response = await controller.validateKey(request, context);
      
      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.valid).toBe(true);
      expect(body.keyId).toBe('test-key-id');
      
      // Verify command bus was called correctly
      expect(container.resolve('commandBus').execute).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'km_test-key-0123456789',
          requiredScopes: ['read:data']
        }),
        expect.any(Object)
      );
    });
    
    it('should validate a key provided in request body', async () => {
      // Prepare a mock successful validation result
      const validationResult = {
        valid: true,
        keyId: 'test-key-id',
        scopes: ['read:data']
      };
      
      container.resolve('commandBus').execute.mockResolvedValue(validationResult);
      
      // Create a request with API key in body
      const request = createMockRequest({
        method: 'POST',
        body: { 
          key: 'km_test-key-0123456789',
          scopes: ['read:data'] 
        }
      });
      
      const context = createMockContext();
      
      // Call controller
      const response = await controller.validateKey(request, context);
      
      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.valid).toBe(true);
      
      // Verify command bus was called correctly
      expect(container.resolve('commandBus').execute).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'km_test-key-0123456789',
          requiredScopes: ['read:data']
        }),
        expect.any(Object)
      );
    });
    
    it('should return validation error for missing API key', async () => {
      // Create a request without API key
      const request = createMockRequest({
        method: 'POST',
        body: { scopes: ['read:data'] }
      });
      
      const context = createMockContext();
      
      // Call controller
      const response = await controller.validateKey(request, context);
      
      // Verify error response
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('API key is required');
      
      // Verify command bus was not called
      expect(container.resolve('commandBus').execute).not.toHaveBeenCalled();
    });
    
    it('should return invalid result for invalid API key format', async () => {
      // Create a request with invalid API key format
      const request = createMockRequest({
        method: 'POST',
        body: { key: 'invalid-key-format' }
      });
      
      const context = createMockContext();
      
      // Call controller
      const response = await controller.validateKey(request, context);
      
      // Verify response indicates invalid but still returns 200
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.valid).toBe(false);
      expect(body.error).toContain('Invalid API key format');
      
      // Verify command bus was not called
      expect(container.resolve('commandBus').execute).not.toHaveBeenCalled();
    });
    
    it('should handle empty scopes array', async () => {
      // Prepare a mock successful validation result
      const validationResult = {
        valid: true,
        keyId: 'test-key-id',
        scopes: ['read:data', 'write:data']
      };
      
      container.resolve('commandBus').execute.mockResolvedValue(validationResult);
      
      // Create a request with empty scopes array
      const request = createMockRequest({
        method: 'POST',
        headers: { 'X-API-Key': 'km_test-key-0123456789' },
        body: { scopes: [] }
      });
      
      const context = createMockContext();
      
      // Call controller
      await controller.validateKey(request, context);
      
      // Verify command bus was called with empty scopes array
      expect(container.resolve('commandBus').execute).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'km_test-key-0123456789',
          requiredScopes: []
        }),
        expect.any(Object)
      );
    });
    
    it('should handle missing scopes field', async () => {
      // Prepare a mock successful validation result
      const validationResult = {
        valid: true,
        keyId: 'test-key-id',
        scopes: ['read:data', 'write:data']
      };
      
      container.resolve('commandBus').execute.mockResolvedValue(validationResult);
      
      // Create a request without scopes field
      const request = createMockRequest({
        method: 'POST',
        headers: { 'X-API-Key': 'km_test-key-0123456789' },
        body: {}
      });
      
      const context = createMockContext();
      
      // Call controller
      await controller.validateKey(request, context);
      
      // Verify command bus was called with empty scopes array
      expect(container.resolve('commandBus').execute).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'km_test-key-0123456789',
          requiredScopes: []
        }),
        expect.any(Object)
      );
    });
  });
});