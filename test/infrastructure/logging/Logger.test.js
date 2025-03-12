import { jest } from "@jest/globals";
import { Logger } from "../../../src/infrastructure/logging/Logger.js";

describe("Logger", () => {
  let config;
  let consoleSpy;

  beforeEach(() => {
    // Mock the config
    config = {
      get: jest.fn(),
      isProduction: jest.fn(),
    };

    // Spy on console methods
    consoleSpy = {
      error: jest.spyOn(console, "error").mockImplementation(() => {}),
      warn: jest.spyOn(console, "warn").mockImplementation(() => {}),
      info: jest.spyOn(console, "info").mockImplementation(() => {}),
      debug: jest.spyOn(console, "debug").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should create a logger with default settings", () => {
    config.get.mockReturnValue("info");
    const logger = new Logger(config);

    expect(logger).toBeDefined();
    expect(logger.configuredLevel).toBe("info");
  });

  it("should use info level if configured level is invalid", () => {
    config.get.mockReturnValue("invalid-level");
    const logger = new Logger(config);

    expect(logger.configuredLevel).toBe("info");
  });

  it("should log error messages", () => {
    config.get.mockReturnValue("error");
    const logger = new Logger(config);

    logger.error("Test error message");
    expect(consoleSpy.error).toHaveBeenCalled();

    const logArg = JSON.parse(consoleSpy.error.mock.calls[0][0]);

    expect(logArg.level).toBe("error");
    expect(logArg.message).toBe("Test error message");
    expect(logArg.timestamp).toBeDefined();
  });

  it("should log warn messages if level is high enough", () => {
    config.get.mockReturnValue("warn");
    const logger = new Logger(config);

    logger.warn("Test warn message");
    logger.error("Test error message");

    expect(consoleSpy.warn).toHaveBeenCalled();
    expect(consoleSpy.error).toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
  });

  it("should not log debug messages if level is info", () => {
    config.get.mockReturnValue("info");
    const logger = new Logger(config);

    logger.debug("Test debug message");
    logger.info("Test info message");

    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).toHaveBeenCalled();
  });

  it("should include error details in logs", () => {
    config.get.mockReturnValue("error");
    config.isProduction.mockReturnValue(false);

    const logger = new Logger(config);
    const testError = new Error("Test error");

    logger.error("Error occurred", { error: testError });

    const logArg = JSON.parse(consoleSpy.error.mock.calls[0][0]);

    expect(logArg.error.name).toBe("Error");
    expect(logArg.error.message).toBe("Test error");
    expect(logArg.error.stack).toBeDefined();
  });

  it("should not include stack trace in production by default", () => {
    config.get.mockImplementation((key, defaultValue) => {
      if (key === "logging.level") return "error";
      if (key === "logging.includeTrace") return false;

      return defaultValue;
    });
    config.isProduction.mockReturnValue(true);

    const logger = new Logger(config);
    const testError = new Error("Test error");

    logger.error("Error occurred", { error: testError });

    const logArg = JSON.parse(consoleSpy.error.mock.calls[0][0]);

    expect(logArg.error.name).toBe("Error");
    expect(logArg.error.message).toBe("Test error");
    expect(logArg.error.stack).toBeUndefined();
  });

  it("should extract request ID from headers", () => {
    config.get.mockImplementation((key, defaultValue) => {
      if (key === "logging.requestIdHeader") return "X-Request-ID";

      return defaultValue;
    });

    const logger = new Logger(config);
    const request = {
      headers: {
        get: jest.fn(header => header === "X-Request-ID" ? "test-request-id" : null),
      },
    };

    const requestId = logger.getRequestId(request);

    expect(requestId).toBe("test-request-id");
    expect(request.headers.get).toHaveBeenCalledWith("X-Request-ID");
  });

  it("should sanitize sensitive information from logs", () => {
    config.get.mockReturnValue("info");
    const logger = new Logger(config);

    logger.info("Test message with sensitive data", {
      user: "test-user",
      password: "secret-password",
      token: "jwt-token",
      key: "api-key",
      secret: "api-secret",
      data: { public: "public-data" },
    });

    const logArg = JSON.parse(consoleSpy.info.mock.calls[0][0]);

    expect(logArg.context.user).toBe("test-user");
    expect(logArg.context.data.public).toBe("public-data");
    expect(logArg.context.password).toBeUndefined();
    expect(logArg.context.token).toBeUndefined();
    expect(logArg.context.key).toBeUndefined();
    expect(logArg.context.secret).toBeUndefined();
  });
});
