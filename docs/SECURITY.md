# Security Implementation Details

This document outlines the security features implemented in the API Key Manager service.

## API Key Generation

API keys are generated using the Web Crypto API to ensure cryptographic randomness:

```javascript
export function generateApiKey(prefix = 'km_') {
  const keyBuffer = new Uint8Array(32);
  crypto.getRandomValues(keyBuffer);
  
  const randomPart = [...keyBuffer]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
    
  return `${prefix}${randomPart}`;
}
```

Key characteristics:
- 32 bytes (256 bits) of entropy
- Hex-encoded for safe transfer
- Prefixed with 'km_' for easy identification
- Keys have a consistent format and length

## Rate Limiting

Rate limiting is implemented to prevent abuse and brute force attacks:

```javascript
export async function checkRateLimit(
  storage, 
  rateLimitKey, 
  limit = 100, 
  windowMs = 60000
) {
  // Get current rate limit data or create new
  const rateLimitData = await storage.get(rateLimitKey) || { 
    count: 0, 
    resetAt: Date.now() + windowMs 
  };
  
  // Reset counter if the time window has passed
  if (rateLimitData.resetAt < Date.now()) {
    rateLimitData.count = 0;
    rateLimitData.resetAt = Date.now() + windowMs;
  }
  
  // Check if rate limit exceeded BEFORE incrementing
  const limited = rateLimitData.count >= limit;
  const retryAfter = Math.ceil((rateLimitData.resetAt - Date.now()) / 1000);
  
  // Calculate remaining
  const remaining = Math.max(0, limit - rateLimitData.count);
  
  // Only increment the counter if not limited
  if (!limited) {
    // Increment counter
    rateLimitData.count++;
    
    // Store updated rate limit data
    await storage.put(rateLimitKey, rateLimitData, { 
      expirationTtl: Math.ceil(windowMs / 1000) + 60 // Add 1 minute buffer
    });
  }
  
  return {
    limited,
    retryAfter,
    remaining,
    reset: rateLimitData.resetAt
  };
}
```

Rate limiting features:
- Per-client tracking based on IP address
- Per-endpoint isolation to prevent cross-endpoint impact
- Configurable limits and time windows
- Automatic reset when the time window expires
- Proper HTTP headers (Retry-After, X-RateLimit-*)

## IP Address Extraction

Client IP addresses are securely extracted with protection against spoofing:

```javascript
export function getClientIp(request) {
  // Prioritize Cloudflare headers
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp && cfIp.trim()) {
    // Sanitize the IP address
    const sanitizedIp = cfIp.trim().replace(/[^a-zA-Z0-9.:]/g, '');
    // Verify it's a valid IP format (basic check)
    if (sanitizedIp.match(/^[0-9a-fA-F.:]{3,45}$/)) {
      return sanitizedIp;
    }
  }
  
  // Fall back to X-Forwarded-For
  const forwardedIp = request.headers.get('X-Forwarded-For');
  if (forwardedIp && forwardedIp.trim()) {
    // Get first IP in the chain (client IP)
    const firstIp = forwardedIp.split(',')[0].trim();
    // Sanitize the IP address
    const sanitizedIp = firstIp.replace(/[^a-zA-Z0-9.:]/g, '');
    // Verify it's a valid IP format (basic check)
    if (sanitizedIp.match(/^[0-9a-fA-F.:]{3,45}$/)) {
      return sanitizedIp;
    }
  }
  
  return 'unknown';
}
```

IP extraction features:
- Prioritizes Cloudflare's CF-Connecting-IP header
- Falls back to X-Forwarded-For when needed
- Extracts only the first IP from X-Forwarded-For chains
- Sanitizes inputs to prevent injection attacks
- Validates IP format before returning
- Returns 'unknown' for missing or invalid headers

## Key Validation and Expiration

Keys are validated with several security checks:

```javascript
async validateKey(apiKey, requiredScopes = []) {
  // Verify key format and lookup existence
  
  // Verify key is not revoked
  if (foundKey.status !== 'active') {
    return { 
      valid: false, 
      error: 'API key is revoked' 
    };
  }

  // Check if the key has expired
  if (foundKey.expiresAt > 0 && foundKey.expiresAt < Date.now()) {
    // Auto-revoke expired keys
    foundKey.status = 'revoked';
    await this.storage.put(getKeyStorageId(keyId), foundKey);
    
    return { 
      valid: false, 
      error: 'API key has expired' 
    };
  }

  // Check if the key has the required scopes (case-insensitive)
  if (requiredScopes.length > 0) {
    const normalizedKeyScopes = foundKey.scopes.map(s => s.toLowerCase());
    const normalizedRequiredScopes = requiredScopes.map(s => s.toLowerCase());
    
    const hasRequiredScopes = normalizedRequiredScopes.every(
      scope => normalizedKeyScopes.includes(scope)
    );
    
    if (!hasRequiredScopes) {
      return { 
        valid: false, 
        error: 'API key does not have the required scopes',
        // Additional details...
      };
    }
  }

  // Update last used timestamp (non-blocking)
  foundKey.lastUsedAt = Date.now();
  this.storage.put(getKeyStorageId(keyId), foundKey)
    .catch(error => console.error('Failed to update lastUsedAt timestamp:', error));

  // Return success
  return { 
    valid: true,
    owner: foundKey.owner,
    scopes: foundKey.scopes,
    keyId: keyId
  };
}
```

Key validation security features:
- Verification of key format
- Immediate rejection of revoked keys
- Automatic expiration and revocation of expired keys
- Case-insensitive scope matching for consistent application
- Non-blocking updates to usage timestamps
- Cleanup of stale lookup entries

## Automatic Key Cleanup

Expired keys are automatically cleaned up via Durable Object alarms:

```javascript
async cleanupExpiredKeys() {
  const now = Date.now();
  const keys = await this.storage.list({ prefix: 'key:' });
  let revokedCount = 0;
  let staleCount = 0;
  const lookupsToClear = [];
  
  // First pass: find and revoke expired keys
  for (const [keyPath, value] of keys) {
    if (!value) continue; // Skip invalid entries
    
    // Check if the key has expired and isn't already revoked
    if (value.expiresAt > 0 && value.expiresAt < now && value.status === 'active') {
      try {
        // Revoke the key
        value.status = 'revoked';
        await this.storage.put(keyPath, value);
        revokedCount++;
        
        // Track the lookup to be removed
        if (value.key) {
          lookupsToClear.push(getLookupStorageId(value.key));
        }
      } catch (error) {
        console.error(`Failed to revoke expired key ${keyPath}:`, error);
      }
    }
  }
  
  // Second pass: find and remove stale lookup entries
  const lookups = await this.storage.list({ prefix: 'lookup:' });
  for (const [lookupPath, keyId] of lookups) {
    if (!keyId) {
      // Remove invalid lookup entries
      try {
        await this.storage.delete(lookupPath);
        staleCount++;
      } catch (error) {
        console.error(`Failed to remove stale lookup ${lookupPath}:`, error);
      }
      continue;
    }
    
    // Check if the key exists and is active
    try {
      const key = await this.storage.get(getKeyStorageId(keyId));
      if (!key || key.status !== 'active') {
        // If key doesn't exist or is revoked, remove the lookup
        await this.storage.delete(lookupPath);
        staleCount++;
      }
    } catch (error) {
      console.error(`Failed to check key for lookup ${lookupPath}:`, error);
    }
  }
  
  return {
    revokedCount,
    staleCount,
    timestamp: now
  };
}
```

Cleanup security features:
- Scheduled automatic cleanup via Durable Object alarms
- Cleanup of both expired keys and stale lookup entries
- Error handling to ensure partial failures don't halt cleanup
- Audit information on cleanup results

## Input Validation

All API inputs are validated to prevent injection and other attacks:

```javascript
// Validate API key creation parameters
export function validateCreateKeyParams(params) {
  const errors = {};
  
  if (!params) {
    return { isValid: false, errors: { general: 'Missing request body' } };
  }
  
  // Check required fields with size limits
  if (!isNonEmptyString(params.name)) {
    errors.name = 'Name must be a non-empty string';
  } else if (params.name.length > MAX_NAME_LENGTH) {
    errors.name = `Name must be at most ${MAX_NAME_LENGTH} characters`;
  }
  
  // Other field validations...
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
```

Input validation features:
- Non-empty string validation
- String length limits to prevent DoS attacks
- Type checking to ensure input consistency 
- UUID format validation
- Rate limiting to prevent brute force attacks

## Storage Security

API keys are stored securely with a two-level approach:

1. The main key record is stored with its ID as the key
2. A lookup index maps the API key value to its ID for validation

This separation allows:
- Fast key validation without exposing key details
- Easy key revocation without changing the key value
- Ability to clean up stale lookups
- Tracking usage and metadata separately from the key itself

## Authorization Model

API keys can be restricted with permission scopes:

- Scopes are defined as strings (e.g., "read:users", "write:posts")
- Multiple scopes can be assigned to a single key
- Scope validation is performed during key validation
- Case-insensitive matching ensures consistent application
- Required scopes can be specific to each API endpoint
- Detailed error messages indicate which scopes are missing

## HTTPS and Network Security

When deployed on Cloudflare, this service automatically benefits from:

- TLS encryption for all traffic
- DDoS protection
- Web Application Firewall (WAF)
- Distributed global caching
- Real-time threat intelligence

## Security Best Practices

This service implements the following security best practices:

1. All inputs are validated and sanitized
2. API keys have sufficient entropy (256 bits)
3. Comprehensive error handling prevents information leakage
4. Rate limiting prevents brute force attacks
5. Keys can be scoped to limit damage if compromised
6. Keys automatically expire if configured
7. Key usage is tracked for audit purposes
8. Revoked keys are immediately invalidated