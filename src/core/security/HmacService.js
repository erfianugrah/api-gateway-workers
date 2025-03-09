import { generateHmac, verifyHmac } from "../../utils/security.js";

/**
 * Service for handling HMAC operations
 */
export class HmacService {
  /**
   * Create a new HmacService
   *
   * @param {string} hmacSecret - Secret for HMAC operations
   * @param {boolean} isTestMode - Whether running in test mode
   */
  constructor(hmacSecret, isTestMode = false) {
    this.hmacSecret = hmacSecret;
    this.isTestMode = isTestMode;
  }

  /**
   * Generate HMAC for a key ID
   *
   * @param {string} keyId - Key ID to sign
   * @returns {Promise<string>} HMAC signature
   */
  async generateHmac(keyId) {
    return generateHmac(keyId, this.hmacSecret, this.isTestMode);
  }

  /**
   * Verify HMAC signature
   *
   * @param {string} keyId - Key ID that was signed
   * @param {string} hmacSignature - HMAC signature to verify
   * @returns {Promise<boolean>} True if signature is valid
   */
  async verifyHmac(keyId, hmacSignature) {
    return verifyHmac(keyId, hmacSignature, this.hmacSecret, this.isTestMode);
  }
}
