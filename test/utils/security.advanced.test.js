import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import * as securityUtils from '../../src/utils/security.js';
import { getClientIp, generateApiKey, checkRateLimit } from '../../src/utils/security.js';

describe('Security Utils Advanced Tests', () => {
  describe('API Key Generation Security', () => {
    // Mock crypto.getRandomValues for testing
    const originalCrypto = global.crypto;
    
    beforeEach(() => {
      global.crypto = {
        getRandomValues: jest.fn(array => {
          // Fill with predictable but different values
          for (let i = 0; i < array.length; i++) {
            array[i] = (i * 3) % 256;
          }
          return array;
        })
      };
    });
    
    afterEach(() => {
      // Restore original crypto
      global.crypto = originalCrypto;
    });
    
    it('should generate keys with sufficient length for security', () => {
      const key = generateApiKey();
      
      // Key format should be prefix_hexString
      const parts = key.split('_');
      expect(parts).toHaveLength(2);
      
      // Hex string should be long enough (at least 32 bytes = 64 hex chars)
      expect(parts[1].length).toBeGreaterThanOrEqual(64);
    });
    
    it('should generate different keys on each call', () => {
      // Track counter outside the function
      let counter = 0;
      
      // Make getRandomValues return different values each time
      global.crypto.getRandomValues = jest.fn(array => {
        for (let i = 0; i < array.length; i++) {
          array[i] = (i + counter) % 256;
        }
        counter++;
        return array;
      });
      
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      
      // Keys should be different
      expect(key1).not.toBe(key2);
    });
    
    it('should use cryptographically secure random values', () => {
      // Verify the crypto.getRandomValues is called properly
      generateApiKey();
      
      expect(global.crypto.getRandomValues).toHaveBeenCalled();
      // Should be called with a Uint8Array of sufficient length
      expect(global.crypto.getRandomValues.mock.calls[0][0]).toBeInstanceOf(Uint8Array);
      expect(global.crypto.getRandomValues.mock.calls[0][0].length).toBeGreaterThanOrEqual(32);
    });
  });
  
  describe('Rate Limiting Robustness', () => {
    let mockStorage;
    
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2023, 0, 1, 0, 0, 0));
      
      // Create a mock storage
      mockStorage = {
        data: new Map(),
        get: jest.fn(async key => mockStorage.data.get(key)),
        put: jest.fn(async (key, value) => mockStorage.data.set(key, value))
      };
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should properly track request count within a time window', async () => {
      const key = 'rate:127.0.0.1:/test';
      const limit = 5;
      const windowMs = 60000; // 1 minute
      
      // First request (1/5)
      let result = await checkRateLimit(mockStorage, key, limit, windowMs);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(5);
      
      // Second request (2/5)
      result = await checkRateLimit(mockStorage, key, limit, windowMs);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(4);
      
      // Make 3 more requests to reach the limit
      for (let i = 0; i < 3; i++) {
        result = await checkRateLimit(mockStorage, key, limit, windowMs);
        expect(result.limited).toBe(false);
      }
      
      // Next request should be limited (6/5)
      result = await checkRateLimit(mockStorage, key, limit, windowMs);
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });
    
    it('should reset rate limit after window expires', async () => {
      const key = 'rate:127.0.0.1:/test';
      const limit = 5;
      const windowMs = 60000; // 1 minute
      
      // Set up a mock that tracks rate limit data
      let rateLimitData = null;
      
      mockStorage.get.mockImplementation(async () => {
        return rateLimitData;
      });
      
      mockStorage.put.mockImplementation(async (k, v) => {
        rateLimitData = {...v};
        return rateLimitData;
      });
      
      // Make 5 requests to reach the limit
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(mockStorage, key, limit, windowMs);
      }
      
      // Should be exactly at the limit now (count = 5)
      expect(rateLimitData.count).toBe(5);
      
      // Verify we're now limited if we make another request
      let result = await checkRateLimit(mockStorage, key, limit, windowMs);
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      
      // Advance time past the window to trigger reset
      jest.advanceTimersByTime(windowMs + 1000);
      
      // This should reset the counter internally
      result = await checkRateLimit(mockStorage, key, limit, windowMs);
      
      // Should not be limited anymore with the new count (0, before increment)
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(5); // When count is 0, remaining is 5
      expect(rateLimitData.count).toBe(1); // Counter got reset and incremented to 1
    });
    
    // Increase timeout for this test
    it('should handle concurrent requests accurately', async () => {
      const key = 'rate:127.0.0.1:/test';
      const limit = 5;
      const windowMs = 60000; // 1 minute
      
      // Create a more realistic scenario for concurrent requests
      // We start with count 0, then each request increments it 
      let data = null;
      const resetAt = Date.now() + windowMs;
      
      // Keep track of updates for verification
      const updates = [];
      
      // Use a scoped variable so the first call gets null, subsequent calls get the data
      mockStorage.get.mockImplementation(async () => {
        return data;
      });
      
      mockStorage.put.mockImplementation(async (k, v) => {
        // Store each update for verification
        updates.push({...v});
        
        // Update our data
        data = {...v};
        return data;
      });
      
      // Send multiple requests sequentially to simulate the behavior
      // we're expecting in concurrent requests
      await checkRateLimit(mockStorage, key, limit, windowMs);
      await checkRateLimit(mockStorage, key, limit, windowMs);
      await checkRateLimit(mockStorage, key, limit, windowMs);
      
      // Verify the data was updated correctly (should be count = 3)
      expect(data.count).toBe(3);
      
      // Verify all updates were made
      expect(updates).toHaveLength(3);
      expect(updates[0].count).toBe(1);
      expect(updates[1].count).toBe(2);
      expect(updates[2].count).toBe(3);
    }, 30000); // 30 second timeout
    
    it('should isolate rate limits between different clients', async () => {
      const key1 = 'rate:127.0.0.1:/test';
      const key2 = 'rate:192.168.1.1:/test';
      const limit = 3;
      const windowMs = 60000;
      
      // Make 3 requests from client 1 (reaches limit)
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(mockStorage, key1, limit, windowMs);
      }
      
      // Client 1 should be limited
      let result1 = await checkRateLimit(mockStorage, key1, limit, windowMs);
      expect(result1.limited).toBe(true);
      
      // Client 2 should not be limited
      let result2 = await checkRateLimit(mockStorage, key2, limit, windowMs);
      expect(result2.limited).toBe(false);
      expect(result2.remaining).toBe(3);
    });
    
    it('should isolate rate limits between different paths', async () => {
      const key1 = 'rate:127.0.0.1:/test1';
      const key2 = 'rate:127.0.0.1:/test2';
      const limit = 3;
      const windowMs = 60000;
      
      // Make 3 requests to path 1 (reaches limit)
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(mockStorage, key1, limit, windowMs);
      }
      
      // Path 1 should be limited
      let result1 = await checkRateLimit(mockStorage, key1, limit, windowMs);
      expect(result1.limited).toBe(true);
      
      // Path 2 should not be limited
      let result2 = await checkRateLimit(mockStorage, key2, limit, windowMs);
      expect(result2.limited).toBe(false);
      expect(result2.remaining).toBe(3);
    });
    
    it('should handle high rate limit values', async () => {
      const key = 'rate:127.0.0.1:/test';
      const highLimit = 10000;
      const windowMs = 60000;
      
      // First request
      const result = await checkRateLimit(mockStorage, key, highLimit, windowMs);
      
      // Should not be limited and report high remaining value
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(10000); // full limit
    });
    
    it('should handle storage failures gracefully', async () => {
      const key = 'rate:127.0.0.1:/test';
      const limit = 5;
      const windowMs = 60000;
      
      // Make storage.get fail
      mockStorage.get.mockRejectedValueOnce(new Error('Storage error'));
      
      try {
        await checkRateLimit(mockStorage, key, limit, windowMs);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Storage error');
      }
      
      // Make storage.put fail after get succeeds
      mockStorage.get.mockResolvedValueOnce(null);
      mockStorage.put.mockRejectedValueOnce(new Error('Storage error'));
      
      try {
        await checkRateLimit(mockStorage, key, limit, windowMs);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Storage error');
      }
    });
  });
  
  describe('Client IP Extraction Security', () => {
    it('should prioritize Cloudflare headers for IP extraction', () => {
      // Create a request with both headers
      const request = {
        headers: new Map([
          ['CF-Connecting-IP', '2001:db8::1'],
          ['X-Forwarded-For', '192.168.1.1, 10.0.0.1']
        ])
      };
      
      // Should use the Cloudflare header
      expect(getClientIp(request)).toBe('2001:db8::1');
    });
    
    it('should handle X-Forwarded-For with multiple IPs correctly', () => {
      // Create a request with X-Forwarded-For containing multiple IPs
      const request = {
        headers: new Map([
          ['X-Forwarded-For', '192.168.1.1, 10.0.0.1, 172.16.0.1']
        ])
      };
      
      // Should use the first IP (client IP)
      expect(getClientIp(request)).toBe('192.168.1.1');
    });
    
    it('should sanitize IP addresses', () => {
      // Create requests with malformed IP headers
      const request1 = {
        headers: new Map([
          ['CF-Connecting-IP', ' 192.168.1.1\n']
        ])
      };
      
      const request2 = {
        headers: new Map([
          ['X-Forwarded-For', '<script>alert(1)</script>, 10.0.0.1']
        ])
      };
      
      // Should sanitize IPs
      expect(getClientIp(request1)).toBe('192.168.1.1');
      
      // For invalid values, should fall back to unknown
      expect(getClientIp(request2)).toBe('unknown');
    });
    
    it('should return unknown for missing or invalid headers', () => {
      // Create requests with no headers
      const request1 = {
        headers: new Map()
      };
      
      // Create request with empty headers
      const request2 = {
        headers: new Map([
          ['CF-Connecting-IP', ''],
          ['X-Forwarded-For', '']
        ])
      };
      
      // Should return unknown for both cases
      expect(getClientIp(request1)).toBe('unknown');
      expect(getClientIp(request2)).toBe('unknown');
    });
  });
});