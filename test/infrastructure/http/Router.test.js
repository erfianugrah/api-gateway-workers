import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Router } from '../../../src/infrastructure/http/Router.js';

// Create mock functions for testing
const mockPreflightResponse = jest.fn(() => new Response('preflight', { status: 204 }));
const mockMethodNotAllowedResponse = jest.fn((methods) => new Response('method not allowed', { 
  status: 405,
  headers: { 'Allow': methods.join(', ') }
}));
const mockErrorResponse = jest.fn(() => new Response('error', { status: 500 }));

// Override the standard response methods for testing
Router.prototype.notFoundResponse = jest.fn(() => new Response('not found', { status: 404 }));
Router.prototype.methodNotAllowedResponse = mockMethodNotAllowedResponse;
Router.prototype.errorResponse = mockErrorResponse;

describe('Router', () => {
  let router;
  let mockContext;
  
  beforeEach(() => {
    // Create a new router for each test
    router = new Router();
    
    // Mock request context
    mockContext = {
      storage: { 
        get: jest.fn(),
        put: jest.fn()
      }
    };
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('addRegex', () => {
    it('should add regex routes to the router', () => {
      router.addRegex('GET', /^\/users\/\d+$/, () => {});
      
      expect(router.routes.length).toBe(1);
      expect(router.routes[0].method).toBe('GET');
      expect(router.routes[0].isRegex).toBe(true);
      expect(router.routes[0].path instanceof RegExp).toBe(true);
    });
    
    it('should throw error when pattern is not a RegExp', () => {
      expect(() => {
        router.addRegex('GET', '/users/:id', () => {});
      }).toThrow('Pattern must be a RegExp instance');
    });
    
    it('should support method chaining', () => {
      const result = router.addRegex('GET', /^\/test$/, () => {});
      
      expect(result).toBe(router);
    });
  });
  
  describe('findRoute with regex support', () => {
    beforeEach(() => {
      // Add standard routes
      router.add('GET', '/test', () => 'get-test');
      router.add('GET', '/users/:id', () => 'get-user');
      
      // Add regex routes
      router.addRegex('GET', /^\/products\/\d+$/, () => 'get-product');
      router.addRegex('GET', /^\/articles\/(\d+)$/, () => 'get-article');
      router.addRegex('GET', /^\/categories\/(?<category>[a-z]+)\/items\/(?<id>\d+)$/, () => 'get-category-item');
    });
    
    it('should find basic regex route matches', () => {
      const route = router.findRoute('GET', '/products/123');
      
      expect(route).toBeDefined();
      expect(route.method).toBe('GET');
      expect(route.isRegex).toBe(true);
      expect(route.params).toEqual({});
    });
    
    it('should extract numbered capture groups from regex routes', () => {
      const route = router.findRoute('GET', '/articles/456');
      
      expect(route).toBeDefined();
      expect(route.method).toBe('GET');
      expect(route.isRegex).toBe(true);
      expect(route.params).toEqual({ '0': '456' });
    });
    
    it('should extract named capture groups from regex routes', () => {
      const route = router.findRoute('GET', '/categories/electronics/items/789');
      
      expect(route).toBeDefined();
      expect(route.method).toBe('GET');
      expect(route.isRegex).toBe(true);
      expect(route.params).toEqual({ 
        category: 'electronics', 
        id: '789' 
      });
    });
    
    it('should return null for non-matching regex routes', () => {
      const route = router.findRoute('GET', '/products/abc');
      expect(route).toBeNull();
    });
  });
  
  describe('route priority', () => {
    beforeEach(() => {
      // Setup routes with different types
      router.add('GET', '/exact', () => 'exact-route');
      router.add('GET', '/users/:id', () => 'param-route');
      router.addRegex('GET', /^\/users\/\d+$/, () => 'regex-route');
    });
    
    it('should prioritize exact routes over parameter routes', () => {
      // Add an exact route that could also match a parameter route
      router.add('GET', '/items/special', () => 'exact-special');
      router.add('GET', '/items/:id', () => 'param-item');
      
      const route = router.findRoute('GET', '/items/special');
      
      expect(route).toBeDefined();
      expect(route.path).toBe('/items/special');
    });
    
    it('should prioritize parameter routes over regex routes', () => {
      // This path could match both the parameter route and regex route
      const route = router.findRoute('GET', '/users/123');
      
      expect(route).toBeDefined();
      expect(route.path).toBe('/users/:id');
    });
    
    it('should test regex routes when other routes do not match', () => {
      // Add a regex route that won't conflict with other routes
      router.addRegex('GET', /^\/files\/[a-z0-9-]+\.pdf$/, () => 'files-route');
      
      const route = router.findRoute('GET', '/files/report-123.pdf');
      
      expect(route).toBeDefined();
      expect(route.isRegex).toBe(true);
    });
  });
  
  describe('handle with regex routes', () => {
    let mockRegexHandler;
    
    beforeEach(() => {
      mockRegexHandler = jest.fn(() => new Response('regex-handler-result'));
      router.addRegex('GET', /^\/api\/v1\/resources\/(\d+)$/, mockRegexHandler);
    });
    
    it('should execute regex route handler with captured parameters', async () => {
      const request = {
        method: 'GET',
        url: 'http://example.com/api/v1/resources/42',
        headers: new Map()
      };
      
      await router.handle(request, mockContext);
      
      expect(mockRegexHandler).toHaveBeenCalledWith(
        request, 
        expect.objectContaining({ 
          params: { '0': '42' }
        })
      );
    });
    
    it('should return method not allowed when regex path exists but method does not', async () => {
      const request = {
        method: 'POST',
        url: 'http://example.com/api/v1/resources/42',
        headers: new Map()
      };
      
      await router.handle(request, mockContext);
      
      expect(mockMethodNotAllowedResponse).toHaveBeenCalledWith(['GET']);
    });
  });
  
  describe('pathMatchesWithParams with regex support', () => {
    it('should match regex patterns against concrete paths', () => {
      expect(router.pathMatchesWithParams(/^\/users\/\d+$/, '/users/123')).toBe(true);
      expect(router.pathMatchesWithParams(/^\/items\/[a-z]+$/, '/items/electronics')).toBe(true);
    });
    
    it('should return false for non-matching regex patterns', () => {
      expect(router.pathMatchesWithParams(/^\/users\/\d+$/, '/users/abc')).toBe(false);
      expect(router.pathMatchesWithParams(/^\/items\/[a-z]+$/, '/products/123')).toBe(false);
    });
    
    it('should still work with parameterized string paths', () => {
      expect(router.pathMatchesWithParams('/users/:id', '/users/123')).toBe(true);
      expect(router.pathMatchesWithParams('/users/:id', '/posts/123')).toBe(false);
    });
  });
});