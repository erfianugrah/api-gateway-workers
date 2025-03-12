import { ValidateKeyHandler } from "../../../../src/core/keys/handlers/ValidateKeyHandler.js";
import { ValidateKeyCommand } from "../../../../src/core/keys/commands/ValidateKeyCommand.js";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

describe("ValidateKeyHandler", () => {
  // Create mock KeyService
  const mockKeyService = {
    validateKey: jest.fn(),
  };

  // Create handler instance
  const handler = new ValidateKeyHandler(mockKeyService);

  beforeEach(() => {
    // Reset mock between tests
    jest.clearAllMocks();
  });

  describe("canHandle", () => {
    it("should return true for ValidateKeyCommand", () => {
      const command = new ValidateKeyCommand({
        apiKey: "km_test-key-0123456789",
        requiredScopes: ["read:data"],
      });

      expect(handler.canHandle(command)).toBe(true);
    });

    it("should return false for other commands", () => {
      const otherCommand = { type: "OtherCommand" };

      expect(handler.canHandle(otherCommand)).toBe(false);
    });
  });

  describe("handle", () => {
    it("should call keyService.validateKey with correct parameters", async () => {
      // Setup test data
      const apiKey = "km_test-key-0123456789";
      const requiredScopes = ["read:data"];
      const command = new ValidateKeyCommand({
        apiKey,
        requiredScopes,
      });

      // Mock validation result
      const validationResult = {
        valid: true,
        keyId: "test-key-id",
        scopes: ["read:data", "write:data"],
      };

      mockKeyService.validateKey.mockResolvedValueOnce(validationResult);

      // Execute handler
      const result = await handler.handle(command);

      // Verify keyService was called correctly
      expect(mockKeyService.validateKey).toHaveBeenCalledWith(apiKey, requiredScopes);

      // Verify result matches mock
      expect(result).toBe(validationResult);
    });

    it("should pass empty array for requiredScopes if not provided", async () => {
      // Setup test data with no scopes
      const apiKey = "km_test-key-0123456789";
      const command = new ValidateKeyCommand({
        apiKey,
      });

      // Execute handler
      await handler.handle(command);

      // Verify keyService was called with empty array
      expect(mockKeyService.validateKey).toHaveBeenCalledWith(apiKey, []);
    });
  });
});
