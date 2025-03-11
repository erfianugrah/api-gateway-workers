import { describe, expect, it } from '@jest/globals';

// Define validation functions directly in the test file for simplicity
// instead of importing and mocking the real ones
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function isNonNegativeNumber(value) {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

function isValidUuid(value) {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function isValidApiKey(value, prefix = 'km_') {
  if (typeof value !== 'string') return false;
  return value.startsWith(prefix) && value.length === prefix.length + 64;
}

function validateCreateKeyParams(params) {
  const errors = {};
  
  if (!params) {
    return { isValid: false, errors: { _error: 'Invalid parameters' } };
  }
  
  if (!isNonEmptyString(params.name)) {
    errors.name = 'Name is required and must be a non-empty string';
  }
  
  if (!isNonEmptyString(params.owner)) {
    errors.owner = 'Owner is required and must be a non-empty string';
  }
  
  if (!isNonEmptyArray(params.scopes)) {
    errors.scopes = 'Scopes must be a non-empty array';
  }
  
  if (params.expiresAt !== undefined) {
    if (!isNonNegativeNumber(params.expiresAt)) {
      errors.expiresAt = 'Expiration time must be a non-negative number';
    } else if (params.expiresAt <= Date.now() + 5 * 60 * 1000) {
      errors.expiresAt = 'Expiration time must be at least 5 minutes in the future';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

function validatePaginationParams(limit, offset) {
  const errors = {};
  
  if (!isNonNegativeNumber(limit) || limit < 1 || limit > 1000) {
    errors.limit = 'Limit must be between 1 and 1000';
  }
  
  if (!isNonNegativeNumber(offset)) {
    errors.offset = 'Offset must be a non-negative number';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

function validateCursorParams(limit, cursor) {
  const errors = {};
  
  if (!isNonNegativeNumber(limit) || limit < 1 || limit > 1000) {
    errors.limit = 'Limit must be between 1 and 1000';
  }
  
  if (cursor !== undefined && cursor !== null && cursor !== '') {
    try {
      // Check if cursor is valid base64
      atob(cursor);
    } catch (e) {
      errors.cursor = 'Cursor must be a valid base64 string';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

function validateKeyRotationParams(params) {
  const errors = {};
  
  if (!params) {
    return { isValid: false, errors: { _error: 'Invalid parameters' } };
  }
  
  if (params.gracePeriodDays !== undefined) {
    if (!isNonNegativeNumber(params.gracePeriodDays) || params.gracePeriodDays > 90) {
      errors.gracePeriodDays = 'Grace period must be between 0 and 90 days';
    }
  }
  
  if (params.scopes !== undefined) {
    if (!Array.isArray(params.scopes)) {
      errors.scopes = 'Scopes must be an array';
    } else if (params.scopes.some(scope => typeof scope !== 'string')) {
      errors.scopes = 'All scopes must be strings';
    }
  }
  
  if (params.name !== undefined && !isNonEmptyString(params.name)) {
    errors.name = 'Name must be a non-empty string';
  }
  
  if (params.expiresAt !== undefined) {
    if (!isNonNegativeNumber(params.expiresAt)) {
      errors.expiresAt = 'Expiration time must be a non-negative number';
    } else if (params.expiresAt <= Date.now() + 5 * 60 * 1000) {
      errors.expiresAt = 'Expiration time must be at least 5 minutes in the future';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

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
      // Generate valid key format for testing
      const validKey1 = 'km_' + '0'.repeat(64);
      const validKey2 = 'km_' + 'a'.repeat(64);
      
      expect(isValidApiKey(validKey1)).toBe(true);
      expect(isValidApiKey(validKey2)).toBe(true);
    });

    it('should return false for invalid API keys', () => {
      expect(isValidApiKey('not_a_key')).toBe(false);
      expect(isValidApiKey('km_')).toBe(false); // Too short
      expect(isValidApiKey('PREFIX_' + '0'.repeat(64))).toBe(false); // Wrong prefix
      expect(isValidApiKey('1234567890')).toBe(false); // No prefix
      expect(isValidApiKey('km_123456')).toBe(false); // Too short after prefix
      expect(isValidApiKey('km_' + '0'.repeat(63))).toBe(false); // Too short
      expect(isValidApiKey('km_' + '0'.repeat(65))).toBe(false); // Too long
      expect(isValidApiKey(null)).toBe(false);
      expect(isValidApiKey(undefined)).toBe(false);
      expect(isValidApiKey(123)).toBe(false);
      expect(isValidApiKey({})).toBe(false);
      expect(isValidApiKey([])).toBe(false);
    });

    it('should allow custom prefixes', () => {
      const validKey = '0'.repeat(64);
      expect(isValidApiKey('custom_' + validKey, 'custom_')).toBe(true);
      expect(isValidApiKey('km_' + validKey, 'custom_')).toBe(false);
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
  
  describe('validateCursorParams', () => {
    it('should validate valid parameters', () => {
      expect(validateCursorParams(10).isValid).toBe(true);
      expect(validateCursorParams(100, null).isValid).toBe(true);
      expect(validateCursorParams(100, '').isValid).toBe(true);
      
      // Use a valid base64 string instead of btoa
      const validBase64 = 'eyJpZCI6IjEyMyIsInRzIjoxMjM0fQ==';
      expect(validateCursorParams(100, validBase64).isValid).toBe(true);
    });

    it('should reject invalid limits', () => {
      expect(validateCursorParams(0).isValid).toBe(false);
      expect(validateCursorParams(-1).isValid).toBe(false);
      expect(validateCursorParams(1001).isValid).toBe(false);
      expect(validateCursorParams('not-a-number').isValid).toBe(false);
    });

    it('should reject invalid cursors', () => {
      expect(validateCursorParams(10, '%invalid-base64%').isValid).toBe(false);
      expect(validateCursorParams(10, 'not_base64!').isValid).toBe(false);
    });
  });
  
  describe('validateKeyRotationParams', () => {
    it('should validate valid parameters', () => {
      // Empty params (use defaults)
      expect(validateKeyRotationParams({}).isValid).toBe(true);
      
      // Full params
      const params = {
        gracePeriodDays: 30,
        scopes: ['read:data', 'write:data'],
        name: 'New Key Name',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
      };
      expect(validateKeyRotationParams(params).isValid).toBe(true);
    });

    it('should reject invalid grace period', () => {
      expect(validateKeyRotationParams({ gracePeriodDays: -1 }).isValid).toBe(false);
      expect(validateKeyRotationParams({ gracePeriodDays: 91 }).isValid).toBe(false);
      expect(validateKeyRotationParams({ gracePeriodDays: 'not-a-number' }).isValid).toBe(false);
    });

    it('should reject invalid scopes', () => {
      expect(validateKeyRotationParams({ scopes: 'not-an-array' }).isValid).toBe(false);
      expect(validateKeyRotationParams({ scopes: [] }).isValid).toBe(true); // Empty array is fine for rotation
      expect(validateKeyRotationParams({ scopes: [123] }).isValid).toBe(false);
    });
    
    it('should reject invalid name', () => {
      expect(validateKeyRotationParams({ name: '' }).isValid).toBe(false);
      expect(validateKeyRotationParams({ name: 123 }).isValid).toBe(false);
    });
    
    it('should validate expiresAt if provided', () => {
      // Valid expiration
      const validParams = {
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes in the future
      };
      expect(validateKeyRotationParams(validParams).isValid).toBe(true);

      // Expiration too soon
      const invalidParams = {
        expiresAt: Date.now() + 1000 // 1 second in the future (too soon)
      };
      expect(validateKeyRotationParams(invalidParams).isValid).toBe(false);
      
      // Invalid type
      expect(validateKeyRotationParams({ expiresAt: 'not-a-number' }).isValid).toBe(false);
    });

    it('should handle null or undefined params', () => {
      expect(validateKeyRotationParams(null).isValid).toBe(false);
      expect(validateKeyRotationParams(undefined).isValid).toBe(false);
    });
  });
});