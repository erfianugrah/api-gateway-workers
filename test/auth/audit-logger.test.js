import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  getActionLogs,
  getAdminLogs,
  getCriticalLogs,
  logAdminAction,
} from "../../src/auth/auditLogger.js";

describe("Audit Logger", () => {
  let mockEnv;
  let mockRequest;

  beforeEach(() => {
    // Create a KV storage mock
    const kvStorage = {
      data: new Map(),
      get: jest.fn(async (key) => kvStorage.data.get(key)),
      put: jest.fn(async (key, value) => kvStorage.data.set(key, value)),
      list: jest.fn(async ({ prefix, cursor, limit }) => {
        const keys = [];
        for (const [key, value] of kvStorage.data.entries()) {
          if (key.startsWith(prefix)) {
            keys.push({ name: key, value });
          }
        }

        const cursorValue = cursor || "";
        const filteredKeys = keys.filter((k) => k.name > cursorValue).slice(
          0,
          limit || 50,
        );

        // Important fix: return null for cursor only when there are no more results
        const hasMore = keys.length > (filteredKeys.length + (cursor
          ? keys.findIndex((k) =>
            k.name > cursorValue
          )
          : 0));

        return {
          keys: filteredKeys,
          cursor: hasMore ? filteredKeys[filteredKeys.length - 1].name : null,
        };
      }),
    };

    // Mock env with KV binding
    mockEnv = { KV: kvStorage };

    // Mock request for IP extraction
    mockRequest = {
      headers: new Map([
        ["CF-Connecting-IP", "192.168.1.1"],
        ["User-Agent", "Test User Agent"],
      ]),
      headers: {
        get: function (header) {
          if (header === "CF-Connecting-IP") return "192.168.1.1";
          if (header === "User-Agent") return "Test User Agent";
          return null;
        },
      },
    };

    // Mock crypto.randomUUID
    jest.spyOn(crypto, "randomUUID").mockImplementation(() => "test-log-id");

    // Mock Date.now
    jest.spyOn(Date, "now").mockImplementation(() => 1609459200000); // 2021-01-01
  });

  describe("logAdminAction", () => {
    it("should log an admin action with the provided details", async () => {
      const adminId = "test-admin-id";
      const action = "create_key";
      const details = { keyId: "test-key-id", name: "Test Key" };

      const logId = await logAdminAction(
        adminId,
        action,
        details,
        mockEnv,
        mockRequest,
      );

      // Should return the log ID
      expect(logId).toBe("test-log-id");

      // Should store the log entry
      expect(mockEnv.KV.put).toHaveBeenCalledWith(
        "log:admin:test-log-id",
        expect.any(String),
      );

      // Get the stored log entry
      const logEntryJson = mockEnv.KV.data.get("log:admin:test-log-id");
      const logEntry = JSON.parse(logEntryJson);

      // Check log entry properties
      expect(logEntry.id).toBe("test-log-id");
      expect(logEntry.adminId).toBe("test-admin-id");
      expect(logEntry.action).toBe("create_key");
      expect(logEntry.details).toEqual(details);
      expect(logEntry.ip).toBe("192.168.1.1");
      expect(logEntry.userAgent).toBe("Test User Agent");
      expect(logEntry.timestamp).toBe(1609459200000);
    });

    it("should log without request information if not provided", async () => {
      const adminId = "test-admin-id";
      const action = "system_config_change";
      const details = { setting: "rate_limit", value: 100 };

      await logAdminAction(adminId, action, details, mockEnv);

      // Get the stored log entry
      const logEntryJson = mockEnv.KV.data.get("log:admin:test-log-id");
      const logEntry = JSON.parse(logEntryJson);

      // Should have unknown IP and user agent
      expect(logEntry.ip).toBe("unknown");
      expect(logEntry.userAgent).toBe("unknown");
    });

    it("should create index entries for admin lookups", async () => {
      const adminId = "test-admin-id";
      const action = "create_key";
      const details = { keyId: "test-key-id" };

      await logAdminAction(adminId, action, details, mockEnv);

      // Should create admin index
      const timeKey = `${Date.now().toString().padStart(16, "0")}_test-log-id`;
      expect(mockEnv.KV.put).toHaveBeenCalledWith(
        `log:admin:by_admin:test-admin-id:${timeKey}`,
        "test-log-id",
      );

      // Should create action index
      expect(mockEnv.KV.put).toHaveBeenCalledWith(
        `log:admin:by_action:create_key:${timeKey}`,
        "test-log-id",
      );
    });

    it("should mark critical actions appropriately", async () => {
      // Test with a critical action
      const adminId = "test-admin-id";
      const criticalAction = "system_config_change";
      const details = { setting: "encryption_key", rotated: true };

      await logAdminAction(adminId, criticalAction, details, mockEnv);

      // Should add to critical logs index
      const timeKey = `${Date.now().toString().padStart(16, "0")}_test-log-id`;
      expect(mockEnv.KV.put).toHaveBeenCalledWith(
        `log:admin:critical:${timeKey}`,
        "test-log-id",
      );

      // Reset mocks
      jest.clearAllMocks();

      // Test with a non-critical action
      const nonCriticalAction = "view_key";
      await logAdminAction(adminId, nonCriticalAction, {}, mockEnv);

      // Should not add to critical logs
      expect(mockEnv.KV.put).not.toHaveBeenCalledWith(
        expect.stringMatching(/^log:admin:critical:/),
        expect.anything(),
      );
    });
  });

  describe("getAdminLogs", () => {
    beforeEach(() => {
      // Add some test log entries
      ["log1", "log2", "log3"].forEach((id, index) => {
        const timeKey = `${
          (1609459200000 + index).toString().padStart(16, "0")
        }_${id}`;
        mockEnv.KV.data.set(`log:admin:by_admin:test-admin:${timeKey}`, id);
        mockEnv.KV.data.set(
          `log:admin:${id}`,
          JSON.stringify({
            id,
            adminId: "test-admin",
            action: `action${index + 1}`,
            timestamp: 1609459200000 + index,
            details: { test: index + 1 },
          }),
        );
      });
    });

    it("should retrieve logs for a specific admin", async () => {
      const result = await getAdminLogs("test-admin", { limit: 10 }, mockEnv);

      expect(result.logs).toHaveLength(3);
      expect(result.logs[0].id).toBe("log1");
      expect(result.logs[1].id).toBe("log2");
      expect(result.logs[2].id).toBe("log3");
      expect(result.hasMore).toBe(false);
    });

    it("should respect the limit parameter", async () => {
      const result = await getAdminLogs("test-admin", { limit: 2 }, mockEnv);

      expect(result.logs).toHaveLength(2);
      expect(result.logs[0].id).toBe("log1");
      expect(result.logs[1].id).toBe("log2");
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBeDefined();
    });

    it("should handle pagination with cursor", async () => {
      // Get first page
      const page1 = await getAdminLogs("test-admin", { limit: 2 }, mockEnv);

      // Get second page using cursor
      const page2 = await getAdminLogs("test-admin", {
        limit: 2,
        cursor: page1.cursor,
      }, mockEnv);

      expect(page2.logs).toHaveLength(1);
      expect(page2.logs[0].id).toBe("log3");
      expect(page2.hasMore).toBe(false);
    });

    it("should handle missing logs gracefully", async () => {
      // Add an index that points to a missing log
      const timeKey = `${
        (1609459200000 + 10).toString().padStart(16, "0")
      }_missing`;
      mockEnv.KV.data.set(
        `log:admin:by_admin:test-admin:${timeKey}`,
        "missing",
      );
      // Don't add the actual log entry

      const result = await getAdminLogs("test-admin", { limit: 10 }, mockEnv);

      // Should filter out the missing log
      expect(result.logs).toHaveLength(3);
      expect(result.logs.every((log) => log !== null)).toBe(true);
    });

    it("should return empty array when no logs exist", async () => {
      const result = await getAdminLogs(
        "no-logs-admin",
        { limit: 10 },
        mockEnv,
      );

      expect(result.logs).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
    });
  });

  describe("getActionLogs", () => {
    beforeEach(() => {
      // Add some test log entries for different actions
      [
        { id: "log1", action: "create_key", admin: "admin1" },
        { id: "log2", action: "create_key", admin: "admin2" },
        { id: "log3", action: "revoke_key", admin: "admin1" },
      ].forEach((log, index) => {
        const timeKey = `${
          (1609459200000 + index).toString().padStart(16, "0")
        }_${log.id}`;
        mockEnv.KV.data.set(
          `log:admin:by_action:${log.action}:${timeKey}`,
          log.id,
        );
        mockEnv.KV.data.set(
          `log:admin:${log.id}`,
          JSON.stringify({
            id: log.id,
            adminId: log.admin,
            action: log.action,
            timestamp: 1609459200000 + index,
            details: { test: index + 1 },
          }),
        );
      });
    });

    it("should retrieve logs for a specific action", async () => {
      const result = await getActionLogs("create_key", { limit: 10 }, mockEnv);

      expect(result.logs).toHaveLength(2);
      expect(result.logs[0].id).toBe("log1");
      expect(result.logs[1].id).toBe("log2");
      expect(result.logs[0].action).toBe("create_key");
      expect(result.logs[1].action).toBe("create_key");
    });

    it("should handle pagination for action logs", async () => {
      // Get first page with limit 1
      const page1 = await getActionLogs("create_key", { limit: 1 }, mockEnv);

      expect(page1.logs).toHaveLength(1);
      expect(page1.logs[0].id).toBe("log1");
      expect(page1.hasMore).toBe(true);

      // Get second page
      const page2 = await getActionLogs("create_key", {
        limit: 1,
        cursor: page1.cursor,
      }, mockEnv);

      expect(page2.logs).toHaveLength(1);
      expect(page2.logs[0].id).toBe("log2");
      expect(page2.hasMore).toBe(false);
    });

    it("should return empty array for action with no logs", async () => {
      const result = await getActionLogs(
        "non_existent_action",
        { limit: 10 },
        mockEnv,
      );

      expect(result.logs).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("getCriticalLogs", () => {
    beforeEach(() => {
      // Add some test critical log entries
      [
        { id: "log1", action: "system_config_change", admin: "admin1" },
        { id: "log2", action: "create_admin", admin: "admin1" },
        { id: "log3", action: "revoke_admin", admin: "admin2" },
      ].forEach((log, index) => {
        const timeKey = `${
          (1609459200000 + index).toString().padStart(16, "0")
        }_${log.id}`;
        mockEnv.KV.data.set(`log:admin:critical:${timeKey}`, log.id);
        mockEnv.KV.data.set(
          `log:admin:${log.id}`,
          JSON.stringify({
            id: log.id,
            adminId: log.admin,
            action: log.action,
            timestamp: 1609459200000 + index,
            details: { test: index + 1 },
          }),
        );
      });
    });

    it("should retrieve all critical logs", async () => {
      const result = await getCriticalLogs({ limit: 10 }, mockEnv);

      expect(result.logs).toHaveLength(3);
      expect(result.logs[0].action).toBe("system_config_change");
      expect(result.logs[1].action).toBe("create_admin");
      expect(result.logs[2].action).toBe("revoke_admin");
    });

    it("should handle pagination for critical logs", async () => {
      // Get first page
      const page1 = await getCriticalLogs({ limit: 2 }, mockEnv);

      expect(page1.logs).toHaveLength(2);
      expect(page1.hasMore).toBe(true);

      // Get second page
      const page2 = await getCriticalLogs({
        limit: 2,
        cursor: page1.cursor,
      }, mockEnv);

      expect(page2.logs).toHaveLength(1);
      expect(page2.logs[0].action).toBe("revoke_admin");
      expect(page2.hasMore).toBe(false);
    });
  });
});
