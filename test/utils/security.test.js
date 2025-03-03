import { describe, expect, it, jest, beforeEach } from '@jest/globals';
// Import directly from the source
import * as securityUtils from '../../src/utils/security.js';
const { generateApiKey, checkRateLimit, getClientIp } = securityUtils;

describe('Security utilities', () => {
  describe('generateApiKey', () => {
    // Mock crypto.getRandomValues for predictable tests
    const originalCrypto = global.crypto;
    
    beforeEach(() => {
      global.crypto = {
        getRandomValues: jest.fn(array => {
          for (let i = 0; i < array.length; i++) {
            array[i] = i % 256; // Predictable values
          }
          return array;
        })
      };
    });
    
    afterEach(() => {
      global.crypto = originalCrypto;
    });
    
    it('should generate a key with default prefix', () => {
      const key = generateApiKey();
      
      // The key should start with the default prefix
      expect(key.startsWith('km_')).toBe(true);
      
      // The key should be long enough
      expect(key.length).toBeGreaterThan(10);
      
      // The full result should be predictable based on our mock
      const expectedSuffix = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
      expect(key).toBe(`km_${expectedSuffix}`);
    });
    
    it('should use a custom prefix if provided', () => {
      const key = generateApiKey('custom_');
      expect(key.startsWith('custom_')).toBe(true);
    });
  });
  
  describe('checkRateLimit', () => {
    let mockStorage;
    
    beforeEach(() => {
      // Create a mock storage
      mockStorage = {
        data: new Map(),
        get: jest.fn(async key => mockStorage.data.get(key)),
        put: jest.fn(async (key, value) => mockStorage.data.set(key, value))
      };
      
      // Mock Date.now to return a predictable value
      jest.spyOn(Date, 'now').mockImplementation(() => 1000000);
    });
    
    afterEach(() => {
      jest.restoreAllMocks();
    });
    
    it('should create a new rate limit record for first request', async () => {
      const result = await checkRateLimit(mockStorage, 'client:key', 100, 60000);
      
      expect(result.limited).toBe(false);
      // Result remaining could be 99 or 100 depending on implementation
      expect(result.remaining).toBeLessThanOrEqual(100);
      expect(result.remaining).toBeGreaterThanOrEqual(99);
      expect(result.reset).toBe(1060000); // 1000000 + 60000
      expect(mockStorage.put).toHaveBeenCalled();
    });
    
    it('should increment counter for subsequent requests', async () => {
      // First request
      await checkRateLimit(mockStorage, 'client:key', 100, 60000);
      
      // Second request
      const result = await checkRateLimit(mockStorage, 'client:key', 100, 60000);
      
      expect(result.limited).toBe(false);
      // Remaining should be less than the first request
      expect(result.remaining).toBeLessThan(100);
      expect(result.remaining).toBeGreaterThanOrEqual(98);
    });
    
    it('should limit requests when limit is reached', async () => {
      // Set up an existing rate limit at the threshold
      mockStorage.data.set('client:key', {
        count: 100,
        resetAt: 1060000
      });
      
      const result = await checkRateLimit(mockStorage, 'client:key', 100, 60000);
      
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(60);
      
      // Counter should not be incremented
      expect(mockStorage.put).not.toHaveBeenCalled();
    });
    
    it('should reset counter when time window has passed', async () => {
      // Set up an expired rate limit
      mockStorage.data.set('client:key', {
        count: 100,
        resetAt: 999000 // Already expired
      });
      
      const result = await checkRateLimit(mockStorage, 'client:key', 100, 60000);
      
      expect(result.limited).toBe(false);
      // After reset, remaining should be high again
      expect(result.remaining).toBeLessThanOrEqual(100);
      expect(result.remaining).toBeGreaterThanOrEqual(99);
      
      // Counter should be reset
      expect(mockStorage.put).toHaveBeenCalledWith(
        'client:key',
        expect.objectContaining({ count: 1, resetAt: 1060000 }),
        expect.anything()
      );
    });
  });
  
  describe('getClientIp', () => {
    it('should extract IP from CF-Connecting-IP header', () => {
      const request = {
        headers: new Map([
          ['CF-Connecting-IP', '192.168.1.1']
        ])
      };
      
      expect(getClientIp(request)).toBe('192.168.1.1');
    });
    
    it('should fall back to X-Forwarded-For header', () => {
      const request = {
        headers: new Map([
          ['X-Forwarded-For', '10.0.0.1']
        ])
      };
      
      expect(getClientIp(request)).toBe('10.0.0.1');
    });
    
    it('should return "unknown" if no IP headers found', () => {
      const request = {
        headers: new Map()
      };
      
      expect(getClientIp(request)).toBe('unknown');
    });
  });
});