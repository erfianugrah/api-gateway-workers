import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { KeysController } from "../../../src/api/controllers/KeysController.js";
import { TestContainer } from "../../utils/TestContainer.js";
import {
  createTestAdmin,
  createTestContext,
  createTestRequest,
} from "../../utils/factories.js";

describe("KeysController", () => {
  let container;
  let controller;

  beforeEach(() => {
    container = new TestContainer();
    controller = new KeysController({
      keyService: container.resolve("keyService"),
      authService: container.resolve("authService"),
      commandBus: container.resolve("commandBus"),
      auditLogger: container.resolve("auditLogger"),
    });
  });

  describe("listKeys", () => {
    it("should return a list of keys", async () => {
      // Mock the key service to return some keys
      container.resolve("keyService").listKeys.mockResolvedValue({
        items: [
          { id: "key1", name: "Key 1" },
          { id: "key2", name: "Key 2" },
        ],
        totalItems: 2,
        limit: 100,
        offset: 0,
      });

      // Create test request and context
      const request = createTestRequest({
        admin: createTestAdmin(),
      });

      const context = createTestContext();

      // Call the controller
      const response = await controller.listKeys(request, context);

      // Check results
      expect(response.status).toBe(200);

      // Parse the response body
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
      expect(body[0].id).toBe("key1");
      expect(body[1].id).toBe("key2");

      // Check pagination headers
      expect(response.headers.get("X-Total-Count")).toBe("2");
      expect(response.headers.get("X-Pagination-Limit")).toBe("100");
      expect(response.headers.get("X-Pagination-Offset")).toBe("0");

      // Check that service was called with correct parameters
      expect(container.resolve("keyService").listKeys).toHaveBeenCalledWith({
        limit: 100,
        offset: 0,
      });
    });

    it("should handle pagination parameters", async () => {
      // Create test request with pagination parameters
      const request = createTestRequest({
        url: "http://example.com/keys?limit=10&offset=20",
        admin: createTestAdmin(),
      });

      const context = createTestContext();

      // Call the controller
      await controller.listKeys(request, context);

      // Check that service was called with correct parameters
      expect(container.resolve("keyService").listKeys).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
      });
    });

    it("should check for admin:keys:read permission", async () => {
      // Mock permission check to fail
      container.mockPermission(false);

      // Create test request and context
      const request = createTestRequest({
        admin: createTestAdmin(),
      });

      const context = createTestContext();

      // Call the controller - should throw ForbiddenError
      await expect(controller.listKeys(request, context))
        .rejects
        .toThrow("You do not have the required permission");
    });
  });

  describe("createKey", () => {
    it("should create a new key", async () => {
      // Create test request with key data
      const request = createTestRequest({
        method: "POST",
        body: {
          name: "New Key",
          owner: "test@example.com",
          scopes: ["read:data"],
        },
        admin: createTestAdmin(),
      });

      const context = createTestContext();

      // Call the controller
      const response = await controller.createKey(request, context);

      // Check results
      expect(response.status).toBe(201);

      // Parse the response body
      const body = JSON.parse(response.body);
      expect(body.id).toBe("test-key-id");
      expect(body.key).toBe("km_test-key");
      expect(body.name).toBe("New Key");

      // Check that command bus was called with correct command
      expect(container.resolve("commandBus").execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Key",
          owner: "test@example.com",
          scopes: ["read:data"],
          createdBy: "test-admin-id",
        }),
        expect.any(Object),
      );
    });

    it("should check for admin:keys:create permission", async () => {
      // Mock permission check to fail
      container.mockPermission(false);

      // Create test request with key data
      const request = createTestRequest({
        method: "POST",
        body: {
          name: "New Key",
          owner: "test@example.com",
          scopes: ["read:data"],
        },
        admin: createTestAdmin(),
      });

      const context = createTestContext();

      // Call the controller - should throw ForbiddenError
      await expect(controller.createKey(request, context))
        .rejects
        .toThrow("You do not have the required permission");
    });
  });
});
