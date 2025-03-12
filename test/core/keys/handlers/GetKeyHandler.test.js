import { GetKeyHandler } from "../../../../src/core/keys/handlers/GetKeyHandler.js";
import { GetKeyCommand } from "../../../../src/core/keys/commands/GetKeyCommand.js";
import { NotFoundError } from "../../../../src/core/errors/ApiError.js";
import { createMockKeyService, createMockAuditLogger } from "../../../utils/index.js";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

describe("GetKeyHandler", () => {
  let handler;
  let keyService;
  let auditLogger;

  beforeEach(() => {
    keyService = createMockKeyService();
    auditLogger = createMockAuditLogger();
    handler = new GetKeyHandler(keyService, auditLogger);
  });

  describe("canHandle", () => {
    it("should return true for GetKeyCommand", () => {
      const command = new GetKeyCommand({ keyId: "test-key-id" });

      expect(handler.canHandle(command)).toBe(true);
    });

    it("should return false for other commands", () => {
      const command = { constructor: { name: "OtherCommand" } };

      expect(handler.canHandle(command)).toBe(false);
    });
  });

  describe("handle", () => {
    it("should retrieve the key from the key service", async () => {
      const command = new GetKeyCommand({ keyId: "test-key-id" });
      const mockKey = { id: "test-key-id", name: "Test Key" };

      keyService.getKey.mockResolvedValue(mockKey);

      const result = await handler.handle(command);

      expect(keyService.getKey).toHaveBeenCalledWith("test-key-id");
      expect(result).toEqual(mockKey);
    });

    it("should throw NotFoundError if key does not exist", async () => {
      const command = new GetKeyCommand({ keyId: "test-key-id" });

      keyService.getKey.mockResolvedValue(null);

      await expect(handler.handle(command)).rejects.toThrow(NotFoundError);
    });

    it("should log the action if admin info is provided", async () => {
      const command = new GetKeyCommand({ keyId: "test-key-id" });
      const mockKey = { id: "test-key-id", name: "Test Key" };
      const context = {
        adminId: "admin-id",
        env: { KV: {} },
        request: { headers: new Map() },
      };

      keyService.getKey.mockResolvedValue(mockKey);

      await handler.handle(command, context);

      expect(auditLogger.logAdminAction).toHaveBeenCalledWith(
        "admin-id",
        "get_key",
        { keyId: "test-key-id" },
        context.env,
        context.request
      );
    });

    it("should not log the action if admin info is not provided", async () => {
      const command = new GetKeyCommand({ keyId: "test-key-id" });
      const mockKey = { id: "test-key-id", name: "Test Key" };

      keyService.getKey.mockResolvedValue(mockKey);

      await handler.handle(command, {});

      expect(auditLogger.logAdminAction).not.toHaveBeenCalled();
    });
  });
});
