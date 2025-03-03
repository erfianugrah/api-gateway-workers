/**
 * Generate a cryptographically secure API key
 * 
 * @param {string} prefix - Prefix to use for the key (default: 'km_')
 * @returns {string} A secure API key
 */
export function generateApiKey(prefix = 'km_') {
  const keyBuffer = new Uint8Array(32);
  crypto.getRandomValues(keyBuffer);
  
  const randomPart = [...keyBuffer]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
    
  return `${prefix}${randomPart}`;
}

/**
 * Check rate limit for a client
 * 
 * @param {DurableObjectStorage} storage - Storage interface
 * @param {string} rateLimitKey - Rate limit storage key
 * @param {number} limit - Maximum requests allowed per time window (default: 100)
 * @param {number} windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns {Promise<Object>} Rate limit check result: { limited, retryAfter, remaining }
 */
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
  
  // Calculate remaining to match the test expectations
  // When count is 0, remaining should be 5 (if limit is 5)
  // When count is 1, remaining should be 4 (if limit is 5)
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

/**
 * Extract client IP from request
 * 
 * @param {Request} request - The request object
 * @returns {string} The client IP or 'unknown'
 */
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