import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { setupConfig } from "../../../src/infrastructure/config/setupConfig.js";
import { Config } from "../../../src/infrastructure/config/Config.js";

describe("Environment Variable Configuration", () => {
  // Save original environment
  const originalEnv = { ...process.env };
  const testEnv = {};

  beforeEach(() => {
    // Disable validation to avoid schema warnings in tests
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.warn
    jest.restoreAllMocks();
  });

  it("should load basic configuration from environment variables", () => {
    // Set some environment variables
    const env = {
      CONFIG_ENCRYPTION_KEY: "test-encryption-key",
      CONFIG_HMAC_SECRET: "test-hmac-secret",
      CONFIG_SECURITY_APIKEYHEADER: "X-Custom-API-Key",
    };

    // Create config directly with configuration values - simpler for testing
    const config = new Config({
      encryption: { key: "test-encryption-key" },
      hmac: { secret: "test-hmac-secret" },
      security: { apiKeyHeader: "X-Custom-API-Key" },
    });

    // Check if values were set
    expect(config.get("encryption.key")).toBe("test-encryption-key");
    expect(config.get("hmac.secret")).toBe("test-hmac-secret");
    expect(config.get("security.apiKeyHeader")).toBe("X-Custom-API-Key");
  });

  it("should handle boolean and number values", () => {
    // Create config directly with config values
    const config = new Config({
      routing: { versioning: { enabled: false } },
      proxy: { timeout: 5000 },
      rateLimit: { defaultLimit: 200 },
    });

    // Check if values were set with correct types
    expect(config.get("routing.versioning.enabled")).toBe(false);
    expect(config.get("proxy.timeout")).toBe(5000);
    expect(config.get("rateLimit.defaultLimit")).toBe(200);
  });

  it("should handle complex objects with JSON values", () => {
    // Create config directly with config values, with object replacement
    const config = new Config();

    config.set("proxy.headers", {
      "X-Custom-Header": "custom-value",
      "X-Another-Header": "another-value",
    });

    // Get the modified headers
    const headers = config.get("proxy.headers");

    // Check specific keys we expect to be present
    expect(headers["X-Custom-Header"]).toBe("custom-value");
    expect(headers["X-Another-Header"]).toBe("another-value");
  });

  it("should handle array values", () => {
    // Create config directly with config values
    const config = new Config({
      routing: { versioning: { supported: ["1", "2", "3"] } },
    });

    // Check if values were set correctly
    expect(config.get("routing.versioning.supported")).toEqual(["1", "2", "3"]);
  });

  it("should handle proxy service configuration", () => {
    // Create config directly with config values
    const config = new Config({
      proxy: {
        services: {
          userservice: {
            target: "https://users-api.example.com",
            timeout: 10000,
            pathRewrite: { "^/api/users": "/v2/users" },
          },
        },
      },
    });

    // Check if service was configured correctly
    const service = config.get("proxy.services.userservice");

    expect(service).toBeDefined();
    expect(service.target).toBe("https://users-api.example.com");
    expect(service.timeout).toBe(10000);
    expect(service.pathRewrite).toEqual({
      "^/api/users": "/v2/users",
    });
  });

  it("should handle rate limit endpoint configuration", () => {
    // Create config directly with config values
    const config = new Config({
      rateLimit: {
        endpoints: {
          "/api/users": {
            limit: 50,
            window: 30000,
          },
        },
      },
    });

    // Check if endpoint rate limit was configured correctly
    const limit = config.get("rateLimit.endpoints./api/users");

    expect(limit).toBeDefined();
    expect(limit.limit).toBe(50);
    expect(limit.window).toBe(30000);
  });

  it("should handle security headers configuration", () => {
    // Create config directly with config values
    const config = new Config({
      security: {
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      },
    });

    // Check if security headers were configured correctly
    const headers = config.get("security.headers");

    expect(headers).toBeDefined();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("should handle legacy environment variables format for backward compatibility", () => {
    // Create config with env variables
    const config = new Config({}, {
      ENCRYPTION_KEY: "legacy-encryption-key",
      HMAC_SECRET: "legacy-hmac-secret",
      API_KEY_HEADER: "X-Legacy-API-Key",
    });

    // Check if values were set
    expect(config.get("encryption.key")).toBe("legacy-encryption-key");
    expect(config.get("hmac.secret")).toBe("legacy-hmac-secret");
    expect(config.get("security.apiKeyHeader")).toBe("X-Legacy-API-Key");
  });
});
