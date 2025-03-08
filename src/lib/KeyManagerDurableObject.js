/**
 * KeyManagerDurableObject
 * Updated to integrate with the auth module
 */

import { DurableObject } from "cloudflare:workers";
import { Router } from "./router.js";
import { ApiKeyManager } from "../models/ApiKeyManager.js";
import {
  handleCreateKey,
  handleGetKey,
  handleListKeys,
  handleListKeysWithCursor,
  handleRevokeKey,
  handleRotateKey,
} from "../handlers/keys.js";
import { handleValidateKey } from "../handlers/validation.js";
import { handleCleanup, handleHealthCheck } from "../handlers/system.js";
import { hasPermission } from "../auth/roles.js";

/**
 * KeyManagerDurableObject is the main Durable Object for the API key manager
 */
export class KeyManagerDurableObject extends DurableObject {
  /**
   * Initialize the KeyManagerDurableObject
   *
   * @param {DurableObjectState} state - Durable Object state
   * @param {Env} env - Environment bindings
   */
  constructor(state, env) {
    super(state, env);
    this.state = state;
    this.env = env;

    // Initialize API Key Manager with environment variables
    this.keyManager = new ApiKeyManager(state.storage, env);

    // Initialize router
    this.router = new Router();

    // Register routes
    this.setupRoutes();

    // Set up periodic cleanup
    this.setupMaintenance();
  }

  /**
   * Set up route handlers
   */
  setupRoutes() {
    // API key management routes
    this.router.add(
      "GET",
      "/keys",
      (req, ctx) =>
        handleListKeys(
          this.keyManager,
          new URL(req.url),
          extractAdminInfo(req),
        ),
    );

    this.router.add(
      "POST",
      "/keys",
      (req, ctx) =>
        handleCreateKey(this.keyManager, req, extractAdminInfo(req)),
    );

    this.router.add(
      "GET",
      "/keys/:id",
      (req, ctx) =>
        handleGetKey(this.keyManager, ctx.params.id, extractAdminInfo(req)),
    );

    this.router.add(
      "DELETE",
      "/keys/:id",
      (req, ctx) =>
        handleRevokeKey(
          this.keyManager,
          ctx.params.id,
          req,
          extractAdminInfo(req),
        ),
    );

    // Key rotation route
    this.router.add(
      "POST",
      "/keys/:id/rotate",
      (req, ctx) =>
        handleRotateKey(
          this.keyManager,
          ctx.params.id,
          req,
          extractAdminInfo(req),
        ),
    );

    // Validation route (public, no auth required)
    this.router.add(
      "POST",
      "/validate",
      (req, ctx) => handleValidateKey(this.keyManager, req),
    );

    // Cursor-based pagination route
    this.router.add(
      "GET",
      "/keys-cursor",
      (req, ctx) =>
        handleListKeysWithCursor(
          this.keyManager,
          new URL(req.url),
          extractAdminInfo(req),
        ),
    );

    // System routes (require admin:system:* permission)
    this.router.add("GET", "/health", (req, ctx) => handleHealthCheck());

    this.router.add("POST", "/maintenance/cleanup", (req, ctx) => {
      const adminInfo = extractAdminInfo(req);

      // Check if admin has system permissions
      if (!hasPermission(adminInfo, "admin:system:maintenance")) {
        return new Response(
          JSON.stringify({
            error: "You do not have permission to run maintenance tasks",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return handleCleanup(this.keyManager);
    });

    // Admin logs route
    this.router.add("GET", "/logs/admin", (req, ctx) => {
      const adminInfo = extractAdminInfo(req);

      // Check if admin has log viewing permissions
      if (!hasPermission(adminInfo, "admin:system:logs")) {
        return new Response(
          JSON.stringify({
            error: "You do not have permission to view logs",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // TODO: Implement logs viewing
      return new Response(
        JSON.stringify({
          message: "Logs viewing to be implemented",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });
  }

  /**
   * Set up periodic maintenance tasks
   */
  setupMaintenance() {
    // Make sure setAlarm is supported (may not be in local dev environment)
    if (typeof this.state.setAlarm === "function") {
      // Set up daily alarm for cleanup
      this.state.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
    } else {
      console.log(
        "Alarms not supported in this environment - scheduled maintenance disabled",
      );
    }
  }

  /**
   * Handle alarms for maintenance tasks
   */
  async alarm() {
    try {
      // Clean up expired keys
      await this.keyManager.cleanupExpiredKeys();

      // Schedule next alarm if supported
      if (typeof this.state.setAlarm === "function") {
        this.state.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
      }
    } catch (error) {
      console.error("Error in alarm handler:", error);

      // Retry sooner if there was an error and if alarms are supported
      if (typeof this.state.setAlarm === "function") {
        this.state.setAlarm(Date.now() + 60 * 60 * 1000); // 1 hour retry
      }
    }
  }

  /**
   * Handle fetch requests
   *
   * @param {Request} request - HTTP request
   * @returns {Promise<Response>} HTTP response
   */
  async fetch(request) {
    return this.router.handle(request, {
      storage: this.state.storage,
      env: this.env,
    });
  }
}

/**
 * Extract admin information from request headers
 *
 * @param {Request} request - HTTP request
 * @returns {Object} Admin information
 */
function extractAdminInfo(request) {
  return {
    keyId: request.headers.get("X-Admin-ID") || null,
    email: request.headers.get("X-Admin-Email") || null,
    role: request.headers.get("X-Admin-Role") || null,
    scopes: [], // We don't have the scopes here - they're checked in the parent worker
    valid: true,
  };
}
