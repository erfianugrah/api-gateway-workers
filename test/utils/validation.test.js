import { describe, expect, it } from '@jest/globals';
import {
  isNonEmptyString,
  isNonEmptyArray,
  isNonNegativeNumber,
  isValidUuid,
  isValidApiKey,
  validateCreateKeyParams,
  validatePaginationParams
} from '../../src/utils/validation.js';

describe('Validation utilities', () => {
  describe('isNonEmptyString', () => {
    it('should return true for valid strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('a')).toBe(true);
      expect(isNonEmptyString(' test ')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
      expect(isNonEmptyString([])).toBe(false);
    });
  });

  describe('isNonEmptyArray', () => {
    it('should return true for arrays with elements', () => {
      expect(isNonEmptyArray([1, 2, 3])).toBe(true);
      expect(isNonEmptyArray(['a'])).toBe(true);
      expect(isNonEmptyArray([{}])).toBe(true);
    });

    it('should return false for empty arrays and non-arrays', () => {
      expect(isNonEmptyArray([])).toBe(false);
      expect(isNonEmptyArray(null)).toBe(false);
      expect(isNonEmptyArray(undefined)).toBe(false);
      expect(isNonEmptyArray('array')).toBe(false);
      expect(isNonEmptyArray(123)).toBe(false);
      expect(isNonEmptyArray({})).toBe(false);
    });
  });

  describe('isNonNegativeNumber', () => {
    it('should return true for zero and positive numbers', () => {
      expect(isNonNegativeNumber(0)).toBe(true);
      expect(isNonNegativeNumber(1)).toBe(true);
      expect(isNonNegativeNumber(1.5)).toBe(true);
      expect(isNonNegativeNumber(Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    it('should return false for negative numbers and non-numbers', () => {
      expect(isNonNegativeNumber(-1)).toBe(false);
      expect(isNonNegativeNumber(-0.1)).toBe(false);
      expect(isNonNegativeNumber(NaN)).toBe(false);
      expect(isNonNegativeNumber(null)).toBe(false);
      expect(isNonNegativeNumber(undefined)).toBe(false);
      expect(isNonNegativeNumber('123')).toBe(false);
      expect(isNonNegativeNumber({})).toBe(false);
      expect(isNonNegativeNumber([])).toBe(false);
    });
  });

  describe('isValidUuid', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUuid('00000000-0000-0000-0000-000000000000')).toBe(true);
      expect(isValidUuid('A987FBC9-4BED-3078-CF07-9141BA07C9F3')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // Too short
      expect(isValidUuid('123e4567-e89b-12d3-a456-4266141740000')).toBe(false); // Too long
      expect(isValidUuid(null)).toBe(false);
      expect(isValidUuid(undefined)).toBe(false);
      expect(isValidUuid(123)).toBe(false);
      expect(isValidUuid({})).toBe(false);
      expect(isValidUuid([])).toBe(false);
    });
  });

  describe('isValidApiKey', () => {
    it('should return true for valid API keys', () => {
      expect(isValidApiKey('km_1234567890abcdef')).toBe(true);
      expect(isValidApiKey('km_a87ff679a2f3e71d9181a67b7542122c')).toBe(true);
    });

    it('should return false for invalid API keys', () => {
      expect(isValidApiKey('not_a_key')).toBe(false);
      expect(isValidApiKey('km_')).toBe(false); // Too short
      expect(isValidApiKey('PREFIX_1234567890')).toBe(false); // Wrong prefix
      expect(isValidApiKey('1234567890')).toBe(false); // No prefix
      expect(isValidApiKey(null)).toBe(false);
      expect(isValidApiKey(undefined)).toBe(false);
      expect(isValidApiKey(123)).toBe(false);
      expect(isValidApiKey({})).toBe(false);
      expect(isValidApiKey([])).toBe(false);
    });

    it('should allow custom prefixes', () => {
      expect(isValidApiKey('custom_1234567890abcdef', 'custom_')).toBe(true);
      expect(isValidApiKey('km_1234567890abcdef', 'custom_')).toBe(false);
    });
  });

  describe('validateCreateKeyParams', () => {
    it('should validate valid parameters', () => {
      const params = {
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data', 'write:data']
      };

      const result = validateCreateKeyParams(params);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should reject missing parameters', () => {
      const params = {
        name: 'Test Key'
        // Missing owner and scopes
      };

      const result = validateCreateKeyParams(params);
      expect(result.isValid).toBe(false);
      expect(result.errors.owner).toBeDefined();
      expect(result.errors.scopes).toBeDefined();
    });

    it('should reject invalid parameter types', () => {
      const params = {
        name: '',
        owner: 123,
        scopes: 'not-an-array'
      };

      const result = validateCreateKeyParams(params);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.owner).toBeDefined();
      expect(result.errors.scopes).toBeDefined();
    });

    it('should validate expiresAt if provided', () => {
      // Valid expiration
      const params1 = {
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes in the future
      };

      const result1 = validateCreateKeyParams(params1);
      expect(result1.isValid).toBe(true);

      // Expiration too soon
      const params2 = {
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: Date.now() + 1000 // 1 second in the future (too soon)
      };

      const result2 = validateCreateKeyParams(params2);
      expect(result2.isValid).toBe(false);
      expect(result2.errors.expiresAt).toBeDefined();

      // Invalid expiration type
      const params3 = {
        name: 'Test Key',
        owner: 'test@example.com',
        scopes: ['read:data'],
        expiresAt: 'not-a-number'
      };

      const result3 = validateCreateKeyParams(params3);
      expect(result3.isValid).toBe(false);
      expect(result3.errors.expiresAt).toBeDefined();
    });

    it('should handle null or undefined params', () => {
      expect(validateCreateKeyParams(null).isValid).toBe(false);
      expect(validateCreateKeyParams(undefined).isValid).toBe(false);
    });
  });

  describe('validatePaginationParams', () => {
    it('should validate valid parameters', () => {
      expect(validatePaginationParams(10, 0).isValid).toBe(true);
      expect(validatePaginationParams(100, 50).isValid).toBe(true);
      expect(validatePaginationParams(1000, 999).isValid).toBe(true);
    });

    it('should reject invalid limits', () => {
      expect(validatePaginationParams(0, 0).isValid).toBe(false);
      expect(validatePaginationParams(-1, 0).isValid).toBe(false);
      expect(validatePaginationParams(1001, 0).isValid).toBe(false);
      expect(validatePaginationParams('not-a-number', 0).isValid).toBe(false);
    });

    it('should reject invalid offsets', () => {
      expect(validatePaginationParams(10, -1).isValid).toBe(false);
      expect(validatePaginationParams(10, 'not-a-number').isValid).toBe(false);
    });
  });
});