import { describe, expect, it } from "@jest/globals";
import { ValidationController } from "../../../src/api/controllers/ValidationController.js";
import { ValidateKeyCommand } from "../../../src/core/keys/commands/ValidateKeyCommand.js";

// Simple test for validation controller
describe("ValidationController - Simple Test", () => {
  it("should create a controller successfully", () => {
    // Create mock dependencies
    const mockCommandBus = {
      execute: async () => ({ valid: true, scopes: ["read:data"] }),
    };

    // Create controller
    const controller = new ValidationController({
      services: {
        commandBus: mockCommandBus,
      },
    });

    // Verify controller was created
    expect(controller).toBeDefined();
    expect(typeof controller.validateKey).toBe("function");
  });
});
