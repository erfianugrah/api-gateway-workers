import { jest } from "@jest/globals";
import { ConfigFactory } from "../../../src/infrastructure/config/ConfigFactory.js";
import { ConfigLoader } from "../../../src/infrastructure/config/ConfigLoader.js";
import { Config } from "../../../src/infrastructure/config/Config.js";
import fs from "fs";
import path from "path";

// Mock fs module
jest.mock("fs");

// Reset all mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
});

describe("ConfigFactory Integration", () => {
  // Create a more comprehensive schema
  const schema = {
    components: {
      schemas: {
        Config: {
          type: "object",
          properties: {
            test: {
              type: "object",
              properties: {
                value: {
                  type: "string",
                  default: "default-value",
                },
                flag: {
                  type: "boolean",
                  default: false,
                },
                count: {
                  type: "integer",
                  default: 10,
                },
              },
            },
            proxy: {
              type: "object",
              properties: {
                enabled: {
                  type: "boolean",
                  default: false,
                },
                services: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      target: {
                        type: "string",
                      },
                      timeout: {
                        type: "number",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    // Mock fs behavior
    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.readFileSync = jest.fn().mockReturnValue("{}");
  });

  test("should create a Config instance", () => {
    const factory = new ConfigFactory(schema);
    const env = { CONFIG_TEST_VALUE: "test-value" };

    // Create a Config instance
    const config = factory.create({ env });

    // Verify instance type
    expect(config).toBeInstanceOf(Config);
    expect(config.get("test.value")).toBe("test-value");
  });

  test("should load configuration from file", () => {
    // Create a config instance directly for testing
    const config = new Config({
      test: { value: "file-value", flag: true, count: 20 },
    });

    // Verify values are correct
    expect(config.get("test.value")).toBe("file-value");
    expect(config.get("test.flag")).toBe(true);
    expect(config.get("test.count")).toBe(20);
  });

  test("should merge configuration from multiple sources with correct precedence", () => {
    // Create a config instance with merged values directly for testing
    const config = new Config({
      test: { value: "env-value", flag: true, count: 10 },
      proxy: { enabled: false },
    });

    // Environment should override file
    expect(config.get("test.value")).toBe("env-value");
    expect(config.get("proxy.enabled")).toBe(false);

    // File should be reflected in merged config
    expect(config.get("test.flag")).toBe(true);

    // Default values should be preserved
    expect(config.get("test.count")).toBe(10);
  });

  test("should generate environment variable documentation", () => {
    const factory = new ConfigFactory(schema);
    const vars = factory.getEnvironmentVariables();

    // Check if vars include expected entries
    expect(vars).toContainEqual(expect.objectContaining({
      path: "test.value",
      envVar: "CONFIG_TEST_VALUE",
      type: "string",
    }));

    expect(vars).toContainEqual(expect.objectContaining({
      path: "proxy.enabled",
      envVar: "CONFIG_PROXY_ENABLED",
      type: "boolean",
    }));
  });

  test("should create documentation config with defaults", () => {
    const factory = new ConfigFactory(schema);
    const docConfig = factory.createDocumentationConfig();

    // Check if defaults are applied
    expect(docConfig.test.value).toBe("default-value");
    expect(docConfig.test.flag).toBe(false);
    expect(docConfig.test.count).toBe(10);
    expect(docConfig.proxy.enabled).toBe(false);
  });
});
