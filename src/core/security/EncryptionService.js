import { decryptData, encryptData } from "../../utils/security.js";

/**
 * Service for handling encryption operations
 */
export class EncryptionService {
  /**
   * Create a new EncryptionService
   *
   * @param {string} encryptionKey - Key for encryption/decryption
   * @param {boolean} isTestMode - Whether running in test mode
   */
  constructor(encryptionKey, isTestMode = false) {
    this.encryptionKey = encryptionKey;
    this.isTestMode = isTestMode;
  }

  /**
   * Encrypt data
   *
   * @param {string} data - Data to encrypt
   * @returns {Promise<Object>} Encrypted data object
   */
  async encrypt(data) {
    return encryptData(data, this.encryptionKey, this.isTestMode);
  }

  /**
   * Decrypt data
   *
   * @param {Object} encryptedObj - Encrypted data object
   * @returns {Promise<string>} Decrypted data
   */
  async decrypt(encryptedObj) {
    return decryptData(encryptedObj, this.encryptionKey, this.isTestMode);
  }
}
