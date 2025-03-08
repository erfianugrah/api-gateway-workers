// Mock audit logger functions
export const logAdminAction = jest.fn().mockResolvedValue(undefined);
export const logValidation = jest.fn().mockResolvedValue(undefined);
export const getActionLogs = jest.fn().mockResolvedValue({
  logs: [
    {
      id: "log-1",
      timestamp: 1000000,
      adminId: "admin-1",
      action: "create_key",
      details: { keyId: "key-1" }
    },
    {
      id: "log-2",
      timestamp: 1000001,
      adminId: "admin-1",
      action: "revoke_key",
      details: { keyId: "key-2" }
    }
  ],
  cursor: null
});