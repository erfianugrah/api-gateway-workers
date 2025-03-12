/**
 * Test for the adminKeysExist function in admin manager
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock dependencies
jest.mock("../../src/auth/keyGenerator.js");
jest.mock("../../src/auth/auditLogger.js");

// Import the function to test
import { adminKeysExist } from "../../src/auth/adminManager.js";

describe("adminKeysExist", () => {
  let mockEnv;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock KV storage
    const kvStorage = {
      data: new Map(),
      get: jest.fn(async (key) => kvStorage.data.get(key)),
      put: jest.fn(async (key, value) => kvStorage.data.set(key, value)),
      list: jest.fn(async ({ prefix }) => {
        const keys = [];

        for (const [key, value] of kvStorage.data.entries()) {
          if (key.startsWith(prefix)) {
            keys.push({ name: key, value });
          }
        }

        return { keys };
      }),
    };

    // Mock env with KV binding
    mockEnv = { KV: kvStorage };
  });

  it("should return true when admin keys exist", async () => {
    // Set up mock data with admin keys
    mockEnv.KV.data.set("index:admin:admin1", "admin1");
    mockEnv.KV.data.set("index:admin:admin2", "admin2");

    const result = await adminKeysExist(mockEnv);

    expect(result).toBe(true);
    expect(mockEnv.KV.list).toHaveBeenCalledWith({ prefix: "index:admin:" });
  });

  it("should return false when no admin keys exist", async () => {
    // No admin keys in the data
    const result = await adminKeysExist(mockEnv);

    expect(result).toBe(false);
  });

  it("should return false when list operation returns empty keys array", async () => {
    // Mock list returning empty keys array
    mockEnv.KV.list.mockResolvedValueOnce({ keys: [] });

    const result = await adminKeysExist(mockEnv);

    expect(result).toBe(false);
  });

  it("should handle storage errors gracefully", async () => {
    // Mock list throwing an error
    mockEnv.KV.list.mockRejectedValueOnce(new Error("Storage failure"));

    // Function should return false on error rather than throwing
    const result = await adminKeysExist(mockEnv);

    expect(result).toBe(false);
  });
});
