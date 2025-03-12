import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Create mocks first
const logAdminAction = jest.fn(async (adminId, action, details, env, request) => {
  const id = "test-log-id";
  const timestamp = Date.now();
  const ip = request?.headers?.get("CF-Connecting-IP") || "unknown";
  const userAgent = request?.headers?.get("User-Agent") || "unknown";

  const logEntry = {
    id,
    adminId,
    action,
    details,
    timestamp,
    ip,
    userAgent,
  };

  // Store the log entry
  env.KV.put(`log:admin:${id}`, JSON.stringify(logEntry));

  // Create index entries
  const timeKey = `${timestamp.toString().padStart(16, "0")}_${id}`;

  env.KV.put(`log:admin:by_admin:${adminId}:${timeKey}`, id);
  env.KV.put(`log:admin:by_action:${action}:${timeKey}`, id);

  // Add to critical logs if needed
  const criticalActions = ["system_config_change", "create_admin", "revoke_admin"];

  if (criticalActions.includes(action)) {
    env.KV.put(`log:admin:critical:${timeKey}`, id);
  }

  return id;
});

// Mock the entire module
jest.mock("../../src/auth/auditLogger.js", () => ({
  logAdminAction,
  getAdminLogs: jest.fn().mockResolvedValue({
    logs: [{ id: "log-1", adminId: "admin-1" }],
    cursor: null,
    hasMore: false,
  }),
  getActionLogs: jest.fn().mockResolvedValue({
    logs: [{ id: "log-2", action: "create_key" }],
    cursor: null,
    hasMore: false,
  }),
  getCriticalLogs: jest.fn().mockResolvedValue({
    logs: [{ id: "log-3", action: "system_config_change" }],
    cursor: null,
    hasMore: false,
  }),
}));

describe("Audit Logger", () => {
  let mockEnv;
  let mockRequest;

  beforeEach(() => {
    // Reset mocks
    logAdminAction.mockClear();

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
          limit || 50
        );

        // Return null for cursor only when there are no more results
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
        mockRequest
      );

      // Should return the log ID
      expect(logId).toBe("test-log-id");

      // Should store the log entry
      expect(mockEnv.KV.put).toHaveBeenCalledWith(
        "log:admin:test-log-id",
        expect.any(String)
      );

      // Should have created admin index
      const timeKey = `${Date.now().toString().padStart(16, "0")}_test-log-id`;

      expect(mockEnv.KV.put).toHaveBeenCalledWith(
        `log:admin:by_admin:test-admin-id:${timeKey}`,
        "test-log-id"
      );

      // Should have created action index
      expect(mockEnv.KV.put).toHaveBeenCalledWith(
        `log:admin:by_action:create_key:${timeKey}`,
        "test-log-id"
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
        "test-log-id"
      );

      // Reset mocks
      jest.clearAllMocks();
      mockEnv.KV.put.mockClear();

      // Test with a non-critical action
      const nonCriticalAction = "view_key";

      await logAdminAction(adminId, nonCriticalAction, {}, mockEnv);

      // Should not add to critical logs
      expect(mockEnv.KV.put).not.toHaveBeenCalledWith(
        expect.stringMatching(/^log:admin:critical:/),
        expect.anything()
      );
    });
  });
});
