import { BaseController } from "./BaseController.js";
import { CreateKeyCommand } from "../../core/keys/commands/CreateKeyCommand.js";
import { RevokeKeyCommand } from "../../core/keys/commands/RevokeKeyCommand.js";
import { RotateKeyCommand } from "../../core/keys/commands/RotateKeyCommand.js";
import { ValidateKeyCommand } from "../../core/keys/commands/ValidateKeyCommand.js";
import { GetKeyCommand } from "../../core/keys/commands/GetKeyCommand.js";
import { ListKeysCommand } from "../../core/keys/commands/ListKeysCommand.js";
import { ListKeysWithCursorCommand } from "../../core/keys/commands/ListKeysWithCursorCommand.js";
import {
  createdResponse,
  successResponse,
} from "../../utils/response.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../../core/errors/ApiError.js";

/**
 * Controller for API key management endpoints
 */
export class KeysController extends BaseController {
  /**
   * Create a new KeysController
   *
   * @param {Object} services - Service dependencies
   */
  constructor(services) {
    super(services);

    // Bind methods to maintain 'this' context
    this.listKeys = this.handle(this.listKeys);
    this.createKey = this.handle(this.createKey);
    this.getKey = this.handle(this.getKey);
    this.revokeKey = this.handle(this.revokeKey);
    this.rotateKey = this.handle(this.rotateKey);
    this.listKeysWithCursor = this.handle(this.listKeysWithCursor);
  }

  /**
   * List API keys
   *
   * @param {Request} request - HTTP request
   * @param {Object} context - Request context
   * @returns {Promise<Response>} HTTP response
   */
  async listKeys(request, context) {
    const adminInfo = this.getAdminInfo(request);

    // Check permissions
    this.services.authService.requirePermission(adminInfo, "admin:keys:read");

    // Parse pagination parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Create command
    const command = new ListKeysCommand({ limit, offset });
    
    // Execute the command
    const result = await this.services.commandBus.execute(command, {
      adminId: adminInfo.keyId,
      env: context.env,
      request,
    });

    // Add pagination headers
    const headers = {
      "X-Total-Count": result.totalItems.toString(),
      "X-Pagination-Limit": result.limit.toString(),
      "X-Pagination-Offset": result.offset.toString(),
    };

    return successResponse(result.items, { headers });
  }

  /**
   * Create a new API key
   *
   * @param {Request} request - HTTP request
   * @param {Object} context - Request context
   * @returns {Promise<Response>} HTTP response
   */
  async createKey(request, context) {
    const adminInfo = this.getAdminInfo(request);

    // Check permissions
    this.services.authService.requirePermission(adminInfo, "admin:keys:create");

    let data;
    try {
      data = await request.json();
    } catch (error) {
      throw new ValidationError("Invalid JSON in request body");
    }

    // Add admin info to the key data
    data.createdBy = adminInfo.keyId;
    data.metadata = {
      ...(data.metadata || {}),
      createdByAdmin: adminInfo.email,
      createdAt: new Date().toISOString(),
    };

    // Create command
    const command = new CreateKeyCommand(data);

    // Execute the command
    const result = await this.services.commandBus.execute(command, {
      env: context.env,
      request,
    });

    return createdResponse(result);
  }

  /**
   * Get API key details
   *
   * @param {Request} request - HTTP request
   * @param {Object} context - Request context
   * @returns {Promise<Response>} HTTP response
   */
  async getKey(request, context) {
    const adminInfo = this.getAdminInfo(request);

    // Check permissions
    this.services.authService.requirePermission(adminInfo, "admin:keys:read");

    const keyId = context.params.id;
    
    // Create command
    const command = new GetKeyCommand({ keyId });
    
    // Execute the command
    const result = await this.services.commandBus.execute(command, {
      adminId: adminInfo.keyId,
      env: context.env,
      request,
    });

    return successResponse(result);
  }

  /**
   * Revoke an API key
   *
   * @param {Request} request - HTTP request
   * @param {Object} context - Request context
   * @returns {Promise<Response>} HTTP response
   */
  async revokeKey(request, context) {
    const adminInfo = this.getAdminInfo(request);

    // Check permissions
    this.services.authService.requirePermission(adminInfo, "admin:keys:revoke");

    const keyId = context.params.id;

    // Extract revocation reason if provided
    let reason = "Administrative action";
    try {
      const body = await request.json();
      if (body && body.reason) {
        reason = body.reason;
      }
    } catch (error) {
      // Ignore JSON parsing errors - use default reason
    }

    // Create command
    const command = new RevokeKeyCommand({
      keyId,
      reason,
      revokedBy: adminInfo.keyId,
    });

    // Execute the command
    const result = await this.services.commandBus.execute(command, {
      env: context.env,
      request,
    });

    return successResponse(result);
  }

  /**
   * Rotate an API key
   *
   * @param {Request} request - HTTP request
   * @param {Object} context - Request context
   * @returns {Promise<Response>} HTTP response
   */
  async rotateKey(request, context) {
    const adminInfo = this.getAdminInfo(request);

    // Check permissions
    this.services.authService.requirePermission(adminInfo, "admin:keys:update");

    const keyId = context.params.id;

    let body = {};
    try {
      body = await request.json();
    } catch (error) {
      // Allow empty body for default rotation
    }

    // Extract rotation options
    const { gracePeriodDays, scopes, name, expiresAt } = body;

    // Create command
    const command = new RotateKeyCommand({
      keyId,
      gracePeriodDays,
      scopes,
      name,
      expiresAt,
      rotatedBy: adminInfo.keyId,
    });

    // Execute the command
    const result = await this.services.commandBus.execute(command, {
      env: context.env,
      request,
    });

    return successResponse(result);
  }

  /**
   * List API keys with cursor-based pagination
   *
   * @param {Request} request - HTTP request
   * @param {Object} context - Request context
   * @returns {Promise<Response>} HTTP response
   */
  async listKeysWithCursor(request, context) {
    const adminInfo = this.getAdminInfo(request);

    // Check permissions
    this.services.authService.requirePermission(adminInfo, "admin:keys:read");

    // Parse parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const cursor = url.searchParams.get("cursor") || null;
    const includeRotated = url.searchParams.get("includeRotated") === "true";

    // Create command
    const command = new ListKeysWithCursorCommand({
      limit,
      cursor,
      includeRotated,
    });

    // Execute the command
    const result = await this.services.commandBus.execute(command, {
      adminId: adminInfo.keyId,
      env: context.env,
      request,
    });

    // Add pagination headers
    const headers = {
      "X-Pagination-Limit": result.limit.toString(),
      "X-Has-More": result.hasMore.toString(),
    };

    if (result.nextCursor) {
      headers["X-Next-Cursor"] = result.nextCursor;
    }

    return successResponse(result.items, { headers });
  }
}
