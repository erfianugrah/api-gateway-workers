import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { Router } from "../../../src/infrastructure/http/Router.js";
import { Config } from "../../../src/infrastructure/config/Config.js";

describe("Router with Config", () => {
  let router;
  let config;
  let mockContext;

  beforeEach(() => {
    // Create a test config with proper versioning configuration
    config = new Config({});

    // Set up versioning configuration directly
    config.set("routing.versioning.enabled", true);
    config.set("routing.versioning.current", "2");
    config.set("routing.versioning.supported", ["1", "2"]);

    // Set up parameter validation regex patterns
    config.set("routing.paramValidation.id", "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");

    // Create router with config
    router = new Router(config);

    // Mock request context
    mockContext = {
      storage: {
        get: jest.fn(),
        put: jest.fn(),
      },
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("addValidated", () => {
    it("should add a route with validated pattern from config", () => {
      const handler = jest.fn(() => new Response("validated-route"));

      router.addValidated("GET", "/keys/:id", "id", "id", handler);

      // Check that route was added with regex pattern
      expect(router.routes.length).toBe(1);
      expect(router.routes[0].method).toBe("GET");
      expect(router.routes[0].isRegex).toBe(true);
      expect(router.routes[0].path instanceof RegExp).toBe(true);
    });

    it("should throw error when config is not provided", () => {
      const routerWithoutConfig = new Router();
      const handler = jest.fn();

      expect(() => {
        routerWithoutConfig.addValidated("GET", "/keys/:id", "id", "id", handler);
      }).toThrow("Config instance required for validated routes");
    });

    it("should throw error when validation pattern is not found", () => {
      const handler = jest.fn();

      expect(() => {
        router.addValidated("GET", "/keys/:id", "nonexistent", "id", handler);
      }).toThrow("No validation pattern found");
    });

    it("should handle path parameters correctly", async () => {
      const handler = jest.fn(() => new Response("success"));

      router.addValidated("GET", "/keys/:id", "id", "id", handler);

      const request = {
        method: "GET",
        url: "http://example.com/keys/a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6",
        headers: new Map(),
      };

      await router.handle(request, mockContext);

      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          params: expect.objectContaining({
            "0": "a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6",
          }),
        })
      );
    });

    it("should not match invalid parameter format", async () => {
      const handler = jest.fn(() => new Response("success"));
      const notFoundSpy = jest.spyOn(router, "notFoundResponse");

      router.addValidated("GET", "/keys/:id", "id", "id", handler);

      const request = {
        method: "GET",
        url: "http://example.com/keys/invalid-id-format",
        headers: new Map(),
      };

      await router.handle(request, mockContext);

      expect(handler).not.toHaveBeenCalled();
      expect(notFoundSpy).toHaveBeenCalled();
    });
  });

  describe("addVersioned", () => {
    it("should add routes for all supported versions", () => {
      const handler = jest.fn();

      router.addVersioned("GET", "/keys", handler);

      // Check that routes were added for both versions
      expect(router.routes.length).toBe(2);

      // Check first route (v1)
      expect(router.routes[0].method).toBe("GET");
      expect(router.routes[0].path).toBe("/v1/keys");

      // Check second route (v2)
      expect(router.routes[1].method).toBe("GET");
      expect(router.routes[1].path).toBe("/v2/keys");
    });

    it("should throw error when config is not provided", () => {
      const routerWithoutConfig = new Router();
      const handler = jest.fn();

      expect(() => {
        routerWithoutConfig.addVersioned("GET", "/keys", handler);
      }).toThrow("Config instance required for versioned routes");
    });

    it("should add normal route when versioning is disabled", () => {
      // Create config with versioning disabled
      const configWithVersioningDisabled = new Config();

      configWithVersioningDisabled.values.routing.versioning.enabled = false;

      // Create router with this config
      const routerWithVersioningDisabled = new Router(configWithVersioningDisabled);

      const handler = jest.fn();

      routerWithVersioningDisabled.addVersioned("GET", "/keys", handler);

      // Check that only one route was added
      expect(routerWithVersioningDisabled.routes.length).toBe(1);
      expect(routerWithVersioningDisabled.routes[0].path).toBe("/keys");
    });

    it("should handle requests to versioned routes", async () => {
      const handler = jest.fn(() => new Response("success"));

      router.addVersioned("GET", "/keys", handler);

      // Request to v1 endpoint
      const requestV1 = {
        method: "GET",
        url: "http://example.com/v1/keys",
        headers: new Map(),
      };

      await router.handle(requestV1, mockContext);

      // Request to v2 endpoint
      const requestV2 = {
        method: "GET",
        url: "http://example.com/v2/keys",
        headers: new Map(),
      };

      await router.handle(requestV2, mockContext);

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe("Combining validated and versioned routes", () => {
    it("should allow creating versioned routes with validated parameters", () => {
      // Create a handler for testing
      const handler = jest.fn(() => new Response("success"));

      // Now use our addVersionedValidated method
      router.addVersionedValidated("GET", "/keys/:id", "id", "id", handler);

      // Verify routes were added correctly
      expect(router.routes.length).toBe(2); // One for each supported version
      expect(router.routes[0].isRegex).toBe(true);
      expect(router.routes[1].isRegex).toBe(true);

      // Verify the regex patterns can match our test routes
      expect(router.routes[0].path.test("/v1/keys/a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6")).toBe(true);
      expect(router.routes[1].path.test("/v2/keys/a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6")).toBe(true);
    });
  });

  describe("Proxy routes", () => {
    let mockProxyService;

    beforeEach(() => {
      // Enable proxy in config
      config.values.proxy.enabled = true;

      // Register test service
      config.registerProxyService("testService", {
        target: "https://api.example.com",
      });

      // Create a mock proxy service
      mockProxyService = {
        proxyRequest: jest.fn(async () => new Response('{"result": "proxied"}', {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })),
      };
    });

    it("should add proxy routes for all HTTP methods", () => {
      router.addProxy("/api/example/*", "testService");

      // Should add routes for GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

      // Check if all methods have a route
      for (const method of methods) {
        const route = router.routes.find(r => r.method === method && r.path === "/api/example/*");

        expect(route).toBeDefined();
      }

      // Expect 7 routes (for the 7 methods)
      expect(router.routes.length).toBe(7);
    });

    it("should throw error when config is not provided", () => {
      const routerWithoutConfig = new Router();

      expect(() => {
        routerWithoutConfig.addProxy("/api/test", "example");
      }).toThrow("Config instance required for proxy routes");
    });

    it("should throw error for unknown service", () => {
      expect(() => {
        router.addProxy("/api/unknown", "unknownService");
      }).toThrow("Unknown proxy service");
    });

    it("should handle proxy requests correctly", async () => {
      // Use an exact path instead of wildcard for testing
      router.addProxy("/api/example/users", "testService");

      const request = new Request("http://localhost/api/example/users");
      const context = {
        proxyService: mockProxyService,
      };

      // Find the GET route
      const route = router.findRoute("GET", "/api/example/users");

      expect(route).toBeDefined();

      // Call the handler
      await route.handler(request, context);

      // Verify proxy service was called
      expect(mockProxyService.proxyRequest).toHaveBeenCalledWith(
        "testService",
        request,
        "/api/example/users"
      );
    });

    it("should strip prefixes if configured", async () => {
      // Again, use an exact path for reliable testing
      router.addProxy("/api/example/users/123", "testService", {
        stripPrefix: "/api/example",
      });

      const request = new Request("http://localhost/api/example/users/123");
      const context = {
        proxyService: mockProxyService,
      };

      // Find the GET route
      const route = router.findRoute("GET", "/api/example/users/123");

      expect(route).toBeDefined();

      // Call the handler
      await route.handler(request, context);

      // Verify proxy service was called with stripped path
      expect(mockProxyService.proxyRequest).toHaveBeenCalledWith(
        "testService",
        request,
        "/users/123"
      );
    });

    it("should handle missing proxy service in context", async () => {
      router.addProxy("/api/examples", "testService");

      const request = new Request("http://localhost/api/examples");
      const context = {}; // Missing proxyService

      // Find the GET route
      const route = router.findRoute("GET", "/api/examples");

      expect(route).toBeDefined();

      // Call the handler
      const response = await route.handler(request, context);

      // Should return error response
      expect(response.status).toBe(500);
      const body = await response.json();

      expect(body.error).toMatch(/proxy service not available/i);
    });
  });
});
