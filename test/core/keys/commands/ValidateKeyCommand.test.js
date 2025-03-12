import { ValidateKeyCommand } from "../../../../src/core/keys/commands/ValidateKeyCommand.js";

describe("ValidateKeyCommand", () => {
  describe("constructor", () => {
    it("should set all properties from data", () => {
      const data = {
        apiKey: "km_test-key-0123456789",
        requiredScopes: ["read:data"],
      };

      const command = new ValidateKeyCommand(data);

      expect(command.apiKey).toBe(data.apiKey);
      expect(command.requiredScopes).toBe(data.requiredScopes);
    });

    it("should set default empty array for requiredScopes if not provided", () => {
      const data = {
        apiKey: "km_test-key-0123456789",
      };

      const command = new ValidateKeyCommand(data);

      expect(command.requiredScopes).toEqual([]);
    });
  });

  describe("validate", () => {
    it("should validate a command with valid apiKey", () => {
      const data = {
        apiKey: "km_test-key-0123456789",
        requiredScopes: ["read:data"],
      };

      const command = new ValidateKeyCommand(data);
      const result = command.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("should return validation errors for missing apiKey", () => {
      const data = {
        // Missing apiKey
        requiredScopes: ["read:data"],
      };

      const command = new ValidateKeyCommand(data);
      const result = command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.apiKey).toBeDefined();
    });

    it("should return validation errors for non-array requiredScopes", () => {
      const data = {
        apiKey: "km_test-key-0123456789",
        requiredScopes: "invalid-scopes-format",
      };

      const command = new ValidateKeyCommand(data);
      const result = command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.requiredScopes).toBeDefined();
    });
  });
});
