import { describe, expect, it } from '@jest/globals';
import { Config } from '../../../src/infrastructure/config/Config.js';

describe('Config', () => {
  describe('constructor', () => {
    it('should initialize with default values', () => {
      // For the new implementation, pass an empty object as the first argument
      // and environment variables as the second argument
      const config = new Config({}, {});
      
      // Check basic properties
      expect(config.values).toBeDefined();
      expect(config.values.encryption).toBeDefined();
      expect(config.values.hmac).toBeDefined();
      expect(config.values.keys).toBeDefined();
      
      // Check that routing configuration exists
      expect(config.values.routing).toBeDefined();
      expect(config.values.routing.versioning).toBeDefined();
      expect(config.values.routing.paramValidation).toBeDefined();
      expect(config.values.routing.priority).toBeDefined();
    });
    
    it('should apply environment overrides', () => {
      const env = {
        KEY_PREFIX: 'custom_',
        API_VERSION_CURRENT: '2',
        API_VERSIONS_SUPPORTED: '1,2,3',
        API_VERSIONS_DEPRECATED: '1',
        API_VERSION_HEADER: 'Custom-API-Version'
      };
      
      // For the new implementation, pass an empty object as the first argument
      // and environment variables as the second argument
      const config = new Config({}, env);
      
      // Check overridden values
      expect(config.get('keys.prefix')).toBe('custom_');
      expect(config.get('routing.versioning.current')).toBe('2');
      expect(config.get('routing.versioning.supported')).toEqual(['1', '2', '3']);
      expect(config.get('routing.versioning.deprecated')).toEqual(['1']);
      expect(config.get('routing.versioning.versionHeader')).toBe('Custom-API-Version');
    });
  });
  
  describe('get', () => {
    it('should retrieve routing configuration values', () => {
      // For the new implementation, pass an empty object as the first argument
      const config = new Config({}, {});
      
      // Check versioning config
      expect(config.get('routing.versioning.enabled')).toBe(true);
      expect(config.get('routing.versioning.current')).toBe('1');
      expect(config.get('routing.versioning.supported')).toEqual(['1']);
      
      // Check parameter validation patterns
      expect(config.get('routing.paramValidation.id')).toBeDefined();
      expect(config.get('routing.paramValidation.date')).toBeDefined();
      expect(config.get('routing.paramValidation.status')).toBeDefined();
      
      // Check route priority
      expect(config.get('routing.priority.exact')).toBe(1);
      expect(config.get('routing.priority.parameter')).toBe(2);
      expect(config.get('routing.priority.regex')).toBe(3);
    });
    
    it('should return default value when path does not exist', () => {
      const config = new Config({}, {});
      
      expect(config.get('routing.nonExistent', 'default')).toBe('default');
      expect(config.get('routing.versioning.nonExistent', 42)).toBe(42);
    });
    
    it('should set and retrieve values with the set method', () => {
      const config = new Config({}, {});
      
      // Set a new value
      config.set('custom.property', 'test-value');
      
      // Check the value was set
      expect(config.get('custom.property')).toBe('test-value');
      
      // Set a nested value
      config.set('custom.nested.property', 123);
      
      // Check the nested value was set
      expect(config.get('custom.nested.property')).toBe(123);
    });
  });
  
  describe('validate', () => {
    it('should not throw error in development environment', () => {
      const config = new Config({}, {});
      
      expect(() => config.validate()).not.toThrow();
    });
  });

  describe('getRegexPattern', () => {
    it('should create a valid regex from a parameter validation pattern', () => {
      const config = new Config({}, {});
      
      // Test UUID pattern
      const uuidRegex = config.getRegexPattern('id');
      expect(uuidRegex).toBeInstanceOf(RegExp);
      expect(uuidRegex.test('a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6')).toBe(false);
      expect(uuidRegex.test('a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6')).toBe(true);
      
      // Test date pattern
      const dateRegex = config.getRegexPattern('date');
      expect(dateRegex).toBeInstanceOf(RegExp);
      expect(dateRegex.test('2023-13-01')).toBe(true); // Only tests format, not validity
      expect(dateRegex.test('2023/01/01')).toBe(false);
      
      // Test status pattern
      const statusRegex = config.getRegexPattern('status');
      expect(statusRegex).toBeInstanceOf(RegExp);
      expect(statusRegex.test('active')).toBe(true);
      expect(statusRegex.test('revoked')).toBe(true);
      expect(statusRegex.test('expired')).toBe(true);
      expect(statusRegex.test('pending')).toBe(false);
    });
  });
  
  describe('proxy configuration', () => {
    it('should have default proxy configuration', () => {
      const config = new Config({}, {});
      
      // Check basic proxy config
      expect(config.get('proxy.enabled')).toBe(false);
      expect(config.get('proxy.timeout')).toBe(30000);
      expect(config.get('proxy.headers')).toBeDefined();
      
      // Check circuit breaker config
      expect(config.get('proxy.circuitBreaker.enabled')).toBe(true);
      expect(config.get('proxy.circuitBreaker.failureThreshold')).toBe(5);
      
      // Check retry config
      expect(config.get('proxy.retry.enabled')).toBe(true);
      expect(config.get('proxy.retry.maxAttempts')).toBe(3);
    });
    
    it('should override proxy configuration from environment', () => {
      const env = {
        PROXY_ENABLED: 'true',
        PROXY_TIMEOUT: '5000',
        PROXY_RETRY_ENABLED: 'false',
        PROXY_RETRY_MAX_ATTEMPTS: '2',
        PROXY_CIRCUIT_BREAKER_ENABLED: 'false'
      };
      
      const config = new Config({}, env);
      
      expect(config.get('proxy.enabled')).toBe(true);
      expect(config.get('proxy.timeout')).toBe(5000);
      expect(config.get('proxy.retry.enabled')).toBe(false);
      expect(config.get('proxy.retry.maxAttempts')).toBe(2);
      expect(config.get('proxy.circuitBreaker.enabled')).toBe(false);
    });
    
    it('should provide proxy configuration via getProxyConfig()', () => {
      const config = new Config({}, {});
      
      const proxyConfig = config.getProxyConfig();
      
      expect(proxyConfig).toBeDefined();
      expect(proxyConfig.enabled).toBe(false);
      expect(proxyConfig.timeout).toBe(30000);
      expect(proxyConfig.headers).toBeDefined();
      expect(proxyConfig.services).toBeDefined();
    });
    
    it('should register proxy services', () => {
      const config = new Config({}, {});
      
      // Register a proxy service
      config.registerProxyService('example', {
        target: 'https://api.example.com',
        pathRewrite: { '^/api/example': '' },
        headers: { 'X-API-Key': 'test' }
      });
      
      // Check the service was registered
      const services = config.get('proxy.services');
      expect(services.example).toBeDefined();
      expect(services.example.target).toBe('https://api.example.com');
      expect(services.example.pathRewrite).toBeDefined();
      
      // Test chaining
      config.registerProxyService('another', {
        target: 'https://another.example.com'
      });
      
      expect(services.another).toBeDefined();
    });
    
    it('should throw error when registering a service without name', () => {
      const config = new Config({}, {});
      
      expect(() => {
        config.registerProxyService(null, { target: 'https://example.com' });
      }).toThrow('Service name is required');
    });
    
    it('should throw error when registering a service without target', () => {
      const config = new Config({}, {});
      
      expect(() => {
        config.registerProxyService('example', {});
      }).toThrow('Service target URL is required');
    });
  });
  
  describe('rate limit configuration', () => {
    it('should provide rate limit configuration via getRateLimitConfig()', () => {
      const config = new Config({}, {});
      
      const rateLimitConfig = config.getRateLimitConfig();
      
      expect(rateLimitConfig).toBeDefined();
      expect(rateLimitConfig.defaultLimit).toBe(100);
      expect(rateLimitConfig.defaultWindow).toBe(60000);
      expect(rateLimitConfig.endpoints).toBeDefined();
      expect(rateLimitConfig.headers).toBeDefined();
    });
    
    it('should register rate limits for endpoints', () => {
      const config = new Config({}, {});
      
      // Register a rate limit
      config.registerRateLimit('/api/test', {
        limit: 50,
        window: 30000
      });
      
      // Check the rate limit was registered
      const endpoints = config.get('rateLimit.endpoints');
      expect(endpoints['/api/test']).toBeDefined();
      expect(endpoints['/api/test'].limit).toBe(50);
      expect(endpoints['/api/test'].window).toBe(30000);
    });
    
    it('should throw error when registering a rate limit without endpoint path', () => {
      const config = new Config({}, {});
      
      expect(() => {
        config.registerRateLimit(null, { limit: 100 });
      }).toThrow('Endpoint path is required');
    });
    
    it('should throw error when registering a rate limit without limit', () => {
      const config = new Config({}, {});
      
      expect(() => {
        config.registerRateLimit('/api/test', {});
      }).toThrow('Rate limit is required');
    });
  });
  
  describe('security configuration', () => {
    it('should provide security configuration via getSecurityConfig()', () => {
      const config = new Config({}, {});
      
      const securityConfig = config.getSecurityConfig();
      
      expect(securityConfig).toBeDefined();
      expect(securityConfig.cors).toBeDefined();
      expect(securityConfig.apiKeyHeader).toBe('X-API-Key');
      expect(securityConfig.headers).toBeDefined();
    });
  });
});