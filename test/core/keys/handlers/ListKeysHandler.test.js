import { describe, expect, it, beforeEach } from "@jest/globals";
import { ListKeysHandler } from "../../../../src/core/keys/handlers/ListKeysHandler.js";
import { ListKeysCommand } from "../../../../src/core/keys/commands/ListKeysCommand.js";
import { createMockKeyService, createMockAuditLogger } from "../../../utils/index.js";

describe("ListKeysHandler", () => {
  let handler;
  let keyService;
  let auditLogger;

  beforeEach(() => {
    keyService = createMockKeyService();
    auditLogger = createMockAuditLogger();
    handler = new ListKeysHandler(keyService, auditLogger);

    // Add spy capability to keyService.listKeys
    keyService.listKeys = async (options = {}) => {
      const mockResult = {
        items: [
          { id: "key1", name: "Key 1" },
          { id: "key2", name: "Key 2" },
        ],
        totalItems: 100,
        limit: options.limit || 100,
        offset: options.offset || 0,
      };

      keyService.listKeys.mock = {
        calls: keyService.listKeys.mock?.calls || [],
      };
      keyService.listKeys.mock.calls.push([options]);

      return mockResult;
    };

    // Add spy capability to auditLogger
    auditLogger.logAdminAction = async (adminId, action, details, env, request) => {
      auditLogger.logAdminAction.mock = {
        calls: auditLogger.logAdminAction.mock?.calls || [],
      };
      auditLogger.logAdminAction.mock.calls.push([adminId, action, details, env, request]);

      return "test-log-id";
    };
  });

  describe("canHandle", () => {
    it("should return true for ListKeysCommand", () => {
      const command = new ListKeysCommand();

      expect(handler.canHandle(command)).toBe(true);
    });

    it("should return false for other commands", () => {
      const command = { constructor: { name: "OtherCommand" } };

      expect(handler.canHandle(command)).toBe(false);
    });
  });

  describe("handle", () => {
    it("should retrieve keys from the key service with correct pagination", async () => {
      const command = new ListKeysCommand({ limit: 20, offset: 40 });

      const result = await handler.handle(command);

      expect(keyService.listKeys.mock.calls[0][0]).toEqual({
        limit: 20,
        offset: 40,
      });
      expect(result).toEqual({
        items: [
          { id: "key1", name: "Key 1" },
          { id: "key2", name: "Key 2" },
        ],
        totalItems: 100,
        limit: 20,
        offset: 40,
      });
    });

    it("should use default values when not specified", async () => {
      const command = new ListKeysCommand();

      await handler.handle(command);

      expect(keyService.listKeys.mock.calls[0][0]).toEqual({
        limit: 100,
        offset: 0,
      });
    });

    it("should log the action if admin info is provided", async () => {
      const command = new ListKeysCommand({ limit: 10, offset: 0 });
      const context = {
        adminId: "admin-id",
        env: { KV: {} },
        request: { headers: new Map() },
      };

      await handler.handle(command, context);

      expect(auditLogger.logAdminAction.mock.calls[0][0]).toBe("admin-id");
      expect(auditLogger.logAdminAction.mock.calls[0][1]).toBe("list_keys");
      expect(auditLogger.logAdminAction.mock.calls[0][2]).toEqual({
        limit: 10,
        offset: 0,
        totalItems: 100,
      });
      expect(auditLogger.logAdminAction.mock.calls[0][3]).toBe(context.env);
      expect(auditLogger.logAdminAction.mock.calls[0][4]).toBe(context.request);
    });

    it("should not log the action if admin info is not provided", async () => {
      const command = new ListKeysCommand();

      await handler.handle(command, {});

      expect(auditLogger.logAdminAction.mock?.calls?.length || 0).toBe(0);
    });
  });
});
