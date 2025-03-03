import { describe, expect, it } from '@jest/globals';
import { ApiKeyManager } from '../src/models/ApiKeyManager.js';

describe('ApiKeyManager', () => {
  // This is a simplified test that only checks if the class exists and has the expected methods
  it('should have required methods', () => {
    // Just check that the ApiKeyManager class exists
    expect(ApiKeyManager).toBeDefined();
    expect(typeof ApiKeyManager).toBe('function');
    
    // No need to instantiate, just check the prototype has the methods
    const prototype = ApiKeyManager.prototype;
    expect(prototype.createKey).toBeDefined();
    expect(typeof prototype.createKey).toBe('function');
    
    expect(prototype.listKeys).toBeDefined();
    expect(typeof prototype.listKeys).toBe('function');
    
    expect(prototype.getKey).toBeDefined();
    expect(typeof prototype.getKey).toBe('function');
    
    expect(prototype.revokeKey).toBeDefined();
    expect(typeof prototype.revokeKey).toBe('function');
    
    expect(prototype.validateKey).toBeDefined();
    expect(typeof prototype.validateKey).toBe('function');
    
    expect(prototype.cleanupExpiredKeys).toBeDefined();
    expect(typeof prototype.cleanupExpiredKeys).toBe('function');
  });
});