import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { KeysController } from "../../../src/api/controllers/KeysController.js";
import { ListKeysCommand } from "../../../src/core/keys/commands/ListKeysCommand.js";
import { CreateKeyCommand } from "../../../src/core/keys/commands/CreateKeyCommand.js";
import {
  TestContainer,
  createTestAdmin,
  createMockContext as createTestContext,
  createMockRequest as createTestRequest,
} from "../../utils/index.js";

describe("KeysController", () => {
  let container;
  let controller;
  let mockCommandBus;
  let mockAuthService;

  beforeEach(() => {
    // Create test container
    container = new TestContainer();

    // Create mock command bus
    mockCommandBus = {
      execute: jest.fn(),
    };

    // Create mock auth service with permission check
    mockAuthService = {
      requirePermission: jest.fn(),
    };

    // Create the controller with mocks
    controller = new KeysController({
      authService: mockAuthService,
      commandBus: mockCommandBus,
      auditLogger: container.resolve("auditLogger"),
      services: {
        authService: mockAuthService,
        commandBus: mockCommandBus,
        auditLogger: container.resolve("auditLogger"),
      },
    });
  });

  describe("listKeys", () => {
    it("should return a list of keys", async () => {
      // Setup mock response
      mockCommandBus.execute.mockResolvedValue({
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
      const body = await response.json();

      expect(body).toHaveLength(2);
      expect(body[0].id).toBe("key1");
      expect(body[1].id).toBe("key2");

      // Check pagination headers
      expect(response.headers.get("X-Total-Count")).toBe("2");
      expect(response.headers.get("X-Pagination-Limit")).toBe("100");
      expect(response.headers.get("X-Pagination-Offset")).toBe("0");

      // Check that command bus was called with correct command
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.any(ListKeysCommand),
        expect.anything()
      );

      // Check command params
      const command = mockCommandBus.execute.mock.calls[0][0];

      expect(command.limit).toBe(100);
      expect(command.offset).toBe(0);

      // Check that auth was checked
      expect(mockAuthService.requirePermission).toHaveBeenCalledWith(
        expect.anything(),
        "admin:keys:read"
      );
    });

    it("should handle pagination parameters", async () => {
      // Setup mock response
      mockCommandBus.execute.mockResolvedValue({
        items: [],
        totalItems: 0,
        limit: 10,
        offset: 20,
      });

      // Create test request with pagination parameters
      const request = createTestRequest({
        url: "http://example.com/keys?limit=10&offset=20",
        admin: createTestAdmin(),
      });

      const context = createTestContext();

      // Call the controller
      await controller.listKeys(request, context);

      // Check that command bus was called with correct parameters
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        }),
        expect.anything()
      );
    });

    it("should check for admin:keys:read permission", async () => {
      // Mock permission check to throw error
      mockAuthService.requirePermission.mockImplementation(() => {
        throw new Error("You do not have permission: admin:keys:read");
      });

      // Create test request and context
      const request = createTestRequest({
        admin: createTestAdmin(),
      });

      const context = createTestContext();

      // Call the controller - should handle the error
      const response = await controller.listKeys(request, context);

      // Should return error response
      expect(response.status).not.toBe(200);
    });
  });

  describe("createKey", () => {
    it("should create a new key", async () => {
      // Setup mock response for key creation
      mockCommandBus.execute.mockResolvedValue({
        id: "test-key-id",
        key: "km_test-key-0123456789",
        name: "New Key",
        owner: "test@example.com",
        scopes: ["read:data"],
      });

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
      const body = await response.json();

      // Check key properties
      expect(body.id).toBe("test-key-id");
      expect(body.key).toBe("km_test-key-0123456789");
      expect(body.name).toBe("New Key");

      // Check that command bus was called with correct command
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.any(CreateKeyCommand),
        expect.anything()
      );

      // Check command data
      const command = mockCommandBus.execute.mock.calls[0][0];

      expect(command.name).toBe("New Key");
      expect(command.owner).toBe("test@example.com");
      expect(command.scopes).toEqual(["read:data"]);

      // Check that auth was checked
      expect(mockAuthService.requirePermission).toHaveBeenCalledWith(
        expect.anything(),
        "admin:keys:create"
      );
    });

    it("should check for admin:keys:create permission", async () => {
      // Mock permission check to throw error
      mockAuthService.requirePermission.mockImplementation(() => {
        throw new Error("You do not have permission: admin:keys:create");
      });

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

      // Call the controller - should handle the error
      const response = await controller.createKey(request, context);

      // Should return error response
      expect(response.status).not.toBe(201);
    });
  });
});
