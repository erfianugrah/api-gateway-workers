/**
 * Check if a value is a non-empty string
 *
 * @param {any} value - The value to check
 * @returns {boolean} True if the value is a non-empty string
 */
export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Check if a value is a non-empty array
 *
 * @param {any} value - The value to check
 * @returns {boolean} True if the value is a non-empty array
 */
export function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if a value is a positive number or zero
 *
 * @param {any} value - The value to check
 * @returns {boolean} True if the value is a non-negative number
 */
export function isNonNegativeNumber(value) {
  return typeof value === "number" && !isNaN(value) && value >= 0;
}

/**
 * Check if a value is a valid UUID
 *
 * @param {string} value - The value to check
 * @returns {boolean} True if the value is a valid UUID
 */
export function isValidUuid(value) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Check if a value is a valid API key
 *
 * @param {string} value - The value to check
 * @param {string} prefix - The expected prefix (default: 'km_')
 * @returns {boolean} True if the value is a valid API key
 */
export function isValidApiKey(value, prefix = "km_") {
  if (typeof value !== "string" || !value.startsWith(prefix) || value.length < 10) {
    return false;
  }

  // More rigorous validation: ensure format is prefix + 64 hex characters
  const keyPattern = new RegExp(`^${prefix}[a-f0-9]{64}$`);

  return keyPattern.test(value);
}

/**
 * Validate API key creation parameters
 *
 * @param {Object} params - The parameters to validate
 * @returns {Object} Object containing { isValid, errors }
 */
export function validateCreateKeyParams(params) {
  const errors = {};

  if (!params) {
    return { isValid: false, errors: { general: "Missing request body" } };
  }

  // Check required fields
  if (!isNonEmptyString(params.name)) {
    errors.name = "Name must be a non-empty string";
  }

  if (!isNonEmptyString(params.owner)) {
    errors.owner = "Owner must be a non-empty string";
  }

  if (!isNonEmptyArray(params.scopes)) {
    errors.scopes = "Scopes must be a non-empty array";
  } else {
    // Check each scope
    const invalidScopes = params.scopes.filter(scope => !isNonEmptyString(scope));

    if (invalidScopes.length > 0) {
      errors.scopes = "Each scope must be a non-empty string";
    }
  }

  // Check expiresAt if provided
  if (params.expiresAt !== undefined) {
    if (!isNonNegativeNumber(params.expiresAt)) {
      errors.expiresAt = "expiresAt must be a non-negative number";
    } else if (params.expiresAt > 0) {
      // Enforce minimum expiration of 5 minutes from now if set
      const minExpiration = Date.now() + (5 * 60 * 1000);

      if (params.expiresAt < minExpiration) {
        errors.expiresAt = "expiresAt must be at least 5 minutes in the future";
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate pagination parameters
 *
 * @param {number} limit - The limit parameter
 * @param {number} offset - The offset parameter
 * @returns {Object} Object containing { isValid, errors }
 */
export function validatePaginationParams(limit, offset) {
  const errors = {};

  if (isNaN(limit) || limit < 1 || limit > 1000) {
    errors.limit = "Limit must be between 1 and 1000";
  }

  if (isNaN(offset) || offset < 0) {
    errors.offset = "Offset must be a non-negative integer";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate cursor-based pagination parameters
 *
 * @param {number} limit - The limit parameter
 * @param {string} cursor - The cursor parameter (optional)
 * @returns {Object} Object containing { isValid, errors }
 */
export function validateCursorParams(limit, cursor) {
  const errors = {};

  if (isNaN(limit) || limit < 1 || limit > 1000) {
    errors.limit = "Limit must be between 1 and 1000";
  }

  // Cursor is optional, but if provided it must be a valid base64 string
  if (cursor !== undefined && cursor !== null && cursor !== "") {
    try {
      // Try to decode the cursor
      atob(cursor);
    } catch (error) {
      errors.cursor = "Invalid cursor format";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate key rotation parameters
 *
 * @param {Object} params - The rotation parameters
 * @returns {Object} Object containing { isValid, errors }
 */
export function validateKeyRotationParams(params) {
  const errors = {};

  if (!params) {
    return { isValid: false, errors: { general: "Missing request body" } };
  }

  // Validate rotation period (optional)
  if (params.gracePeriodDays !== undefined) {
    if (!Number.isInteger(params.gracePeriodDays) || params.gracePeriodDays < 0 || params.gracePeriodDays > 90) {
      errors.gracePeriodDays = "Grace period must be an integer between 0 and 90 days";
    }
  }

  // Validate scope updates (optional)
  if (params.scopes !== undefined) {
    if (!Array.isArray(params.scopes)) {
      errors.scopes = "Scopes must be an array";
    } else {
      // Check each scope
      const invalidScopes = params.scopes.filter(scope => !isNonEmptyString(scope));

      if (invalidScopes.length > 0) {
        errors.scopes = "Each scope must be a non-empty string";
      }
    }
  }

  // Validate name update (optional)
  if (params.name !== undefined && !isNonEmptyString(params.name)) {
    errors.name = "Name must be a non-empty string";
  }

  // Validate expiration update (optional)
  if (params.expiresAt !== undefined) {
    if (!isNonNegativeNumber(params.expiresAt)) {
      errors.expiresAt = "expiresAt must be a non-negative number";
    } else if (params.expiresAt > 0) {
      // Enforce minimum expiration of 5 minutes from now if set
      const minExpiration = Date.now() + (5 * 60 * 1000);

      if (params.expiresAt < minExpiration) {
        errors.expiresAt = "expiresAt must be at least 5 minutes in the future";
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
