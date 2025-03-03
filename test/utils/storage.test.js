import { describe, expect, it } from '@jest/globals';
import { 
  STORAGE_PREFIXES, 
  getKeyStorageId, 
  getLookupStorageId, 
  getRateLimitStorageId 
} from '../../src/utils/storage.js';

describe('Storage utilities', () => {
  describe('STORAGE_PREFIXES', () => {
    it('should define all required prefixes', () => {
      expect(STORAGE_PREFIXES.KEY).toBeDefined();
      expect(STORAGE_PREFIXES.LOOKUP).toBeDefined();
      expect(STORAGE_PREFIXES.RATE).toBeDefined();
    });
  });
  
  describe('getKeyStorageId', () => {
    it('should generate a valid key storage ID', () => {
      const keyId = '12345678-1234-5678-abcd-123456789abc';
      const storageId = getKeyStorageId(keyId);
      
      expect(storageId).toBe(`${STORAGE_PREFIXES.KEY}${keyId}`);
    });
  });
  
  describe('getLookupStorageId', () => {
    it('should generate a valid lookup storage ID', () => {
      const apiKey = 'km_abcdef123456';
      const storageId = getLookupStorageId(apiKey);
      
      expect(storageId).toBe(`${STORAGE_PREFIXES.LOOKUP}${apiKey}`);
    });
  });
  
  describe('getRateLimitStorageId', () => {
    it('should generate a valid rate limit storage ID', () => {
      const clientIp = '192.168.1.1';
      const path = '/keys';
      const storageId = getRateLimitStorageId(clientIp, path);
      
      expect(storageId).toBe(`${STORAGE_PREFIXES.RATE}${clientIp}:${path}`);
    });
  });
});