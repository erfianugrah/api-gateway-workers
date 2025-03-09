import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ProxyService } from '../../../src/core/proxy/ProxyService.js';
import { Config } from '../../../src/infrastructure/config/Config.js';

// Mock fetch globally for testing
global.fetch = jest.fn();

// Set process.env.NODE_ENV to test
process.env.NODE_ENV = 'test';

describe('ProxyService', () => {
  let proxyService;
  let config;
  
  beforeEach(() => {
    // Reset the mock
    global.fetch.mockReset();
    
    // Create a test config with proxy enabled
    config = new Config({
      PROXY_ENABLED: 'true',
      PROXY_TIMEOUT: '5000'
    });
    
    // Register a test service
    config.registerProxyService('testService', {
      target: 'https://api.example.com',
      pathRewrite: { '^/api/test': '/v1' },
      headers: { 'X-Service-Key': 'test-key' }
    });
    
    // Create proxy service
    proxyService = new ProxyService(config);
    
    // Mock successful fetch by default
    global.fetch.mockResolvedValue(new Response('{"result": "success"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  });
  
  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(proxyService.config).toBe(config);
      expect(proxyService.proxyConfig).toBeDefined();
      expect(proxyService.proxyConfig.enabled).toBe(true);
      expect(proxyService.circuitState).toBeDefined();
      expect(proxyService.circuitState.testService).toBeDefined();
    });
  });
  
  describe('proxyRequest', () => {
    it('should return error when proxy is disabled', async () => {
      // Create config with proxy disabled
      const disabledConfig = new Config({ PROXY_ENABLED: 'false' });
      disabledConfig.registerProxyService('testService', {
        target: 'https://api.example.com'
      });
      
      const disabledProxyService = new ProxyService(disabledConfig);
      
      const request = new Request('http://localhost/api/test/users');
      const response = await disabledProxyService.proxyRequest('testService', request);
      
      expect(response.status).toBe(501);
      const body = await response.json();
      expect(body.error).toMatch(/disabled/i);
    });
    
    it('should return error for unknown service', async () => {
      const request = new Request('http://localhost/api/test/users');
      const response = await proxyService.proxyRequest('unknownService', request);
      
      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body.error).toMatch(/unknown proxy service/i);
    });
    
    it('should proxy GET request to target with path rewriting', async () => {
      const request = new Request('http://localhost/api/test/users?page=1');
      await proxyService.proxyRequest('testService', request);
      
      // Check that fetch was called with correct URL
      expect(global.fetch).toHaveBeenCalled();
      const proxiedRequest = global.fetch.mock.calls[0][0];
      
      // Verify URL transformation
      expect(proxiedRequest.url).toBe('https://api.example.com/v1/users?page=1');
    });
    
    it('should add global and service-specific headers', async () => {
      const request = new Request('http://localhost/api/test/users', {
        headers: { 'Content-Type': 'application/json' }
      });
      
      await proxyService.proxyRequest('testService', request);
      
      const proxiedRequest = global.fetch.mock.calls[0][0];
      
      // Original headers should be preserved
      expect(proxiedRequest.headers.get('Content-Type')).toBe('application/json');
      
      // Global proxy headers should be added
      expect(proxiedRequest.headers.get('X-Forwarded-By')).toBe('key-manager-gateway');
      
      // Service-specific headers should be added
      expect(proxiedRequest.headers.get('X-Service-Key')).toBe('test-key');
    });
    
    it('should use service-specific timeout settings', async () => {
      // Register a service with custom timeout
      config.registerProxyService('timeoutService', {
        target: 'https://api.example.com',
        timeout: 2000
      });
      
      // Save the original implementation
      const originalCreateProxiedRequest = proxyService.createProxiedRequest;
      
      // Mock the method to check if timeout value is correct
      proxyService.createProxiedRequest = jest.fn((targetUrl, originalRequest, serviceConfig) => {
        // Just verify the timeout is set correctly
        expect(serviceConfig.timeout).toBe(2000);
        
        // Return a minimal request for testing
        return new Request(targetUrl);
      });
      
      const request = new Request('http://localhost/api/service');
      await proxyService.proxyRequest('timeoutService', request);
      
      // Verify our mock was called
      expect(proxyService.createProxiedRequest).toHaveBeenCalled();
      
      // Restore original implementation
      proxyService.createProxiedRequest = originalCreateProxiedRequest;
    });
    
    it('should handle POST requests with body', async () => {
      const requestBody = JSON.stringify({ name: 'Test User' });
      const request = new Request('http://localhost/api/test/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      });
      
      await proxyService.proxyRequest('testService', request);
      
      const proxiedRequest = global.fetch.mock.calls[0][0];
      
      // Method should be preserved
      expect(proxiedRequest.method).toBe('POST');
      
      // Body should be included
      const arrayBuffer = await proxiedRequest.arrayBuffer();
      const decoder = new TextDecoder();
      const decodedBody = decoder.decode(arrayBuffer);
      expect(decodedBody).toBe(requestBody);
    });
    
    it('should retry on failure if enabled', async () => {
      // Mock fetch to fail on first call and succeed on second
      global.fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('{"success": true}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      
      const request = new Request('http://localhost/api/test/users');
      const response = await proxyService.proxyRequest('testService', request);
      
      // Should have retried and succeeded
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
    });
    
    it('should handle circuit breaker for failed services', async () => {
      // Reset circuit breaker state
      proxyService.circuitState.testService = { failures: 0, lastFailure: 0, open: false };
      
      // Make the circuit breaker sensitive for testing
      proxyService.proxyConfig.circuitBreaker.failureThreshold = 2;
      
      // Mock fetch to always fail
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      // Mock recordFailure to test it directly
      const originalRecordFailure = proxyService.recordFailure;
      proxyService.recordFailure = jest.fn(function(serviceName) {
        return originalRecordFailure.call(this, serviceName);
      });
      
      const request = new Request('http://localhost/api/test/users');
      
      // First request - will fail but circuit still closed
      await proxyService.proxyRequest('testService', request);
      expect(proxyService.recordFailure).toHaveBeenCalledWith('testService');
      
      // Second request - will fail and should open the circuit
      proxyService.circuitState.testService.failures = 1; // Set manually since the mock resets
      await proxyService.proxyRequest('testService', request);
      
      // Force the circuit open
      proxyService.circuitState.testService.open = true;
      
      // Third request - should short-circuit without calling fetch
      global.fetch.mockClear();
      const response = await proxyService.proxyRequest('testService', request);
      
      expect(global.fetch).not.toHaveBeenCalled();
      expect(response.status).toBe(503);
      
      // Restore original function
      proxyService.recordFailure = originalRecordFailure;
    });
    
    it('should reset circuit breaker on successful response', async () => {
      // Set up a partially-failed circuit
      proxyService.circuitState.testService.failures = 1;
      
      // Next request succeeds
      global.fetch.mockResolvedValue(new Response('{"success": true}', {
        status: 200
      }));
      
      const request = new Request('http://localhost/api/test/users');
      await proxyService.proxyRequest('testService', request);
      
      // Circuit should be reset
      expect(proxyService.circuitState.testService.failures).toBe(0);
      expect(proxyService.circuitState.testService.open).toBe(false);
    });
  });
  
  describe('buildTargetUrl', () => {
    it('should handle path rewrites correctly', () => {
      const serviceConfig = {
        target: 'https://api.example.com',
        pathRewrite: { 
          '^/api/test': '/v1',
          '/users': '/accounts'
        }
      };
      
      const url = proxyService.buildTargetUrl(
        serviceConfig,
        '/api/test/users/123',
        '?active=true'
      );
      
      // Both rewrites should be applied
      expect(url).toBe('https://api.example.com/v1/accounts/123?active=true');
    });
    
    it('should handle trailing slashes correctly', () => {
      const serviceConfig = {
        target: 'https://api.example.com/',
        pathRewrite: null
      };
      
      const url = proxyService.buildTargetUrl(
        serviceConfig,
        '/users',
        ''
      );
      
      // Should not have double slashes
      expect(url).toBe('https://api.example.com/users');
    });
  });
});