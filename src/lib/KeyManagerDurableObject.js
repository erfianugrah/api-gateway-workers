/**
 * KeyManagerDurableObject
 * Updated to integrate with the auth module
 */

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
import { logAdminAction } from "../auth/auditLogger.js";

/**
 * KeyManagerDurableObject is the main Durable Object for the API key manager
 */
export class KeyManagerDurableObject {
  /**
   * Initialize the KeyManagerDurableObject
   *
   * @param {DurableObjectState} state - Durable Object state
   * @param {Env} env - Environment bindings
   */
  constructor(state, env) {
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

    this.router.add("POST", "/maintenance/cleanup", async (req, ctx) => {
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

      // Log the maintenance action
      await logAdminAction(
        adminInfo.keyId,
        "system_maintenance",
        { operation: "cleanup" },
        this.env,
      );

      return handleCleanup(this.keyManager);
    });

    // Rotate encryption keys (extremely sensitive operation)
    this.router.add("POST", "/maintenance/rotate-keys", async (req, ctx) => {
      const adminInfo = extractAdminInfo(req);

      // Check if admin has super admin permissions
      if (!hasPermission(adminInfo, "admin:system:security")) {
        return new Response(
          JSON.stringify({
            error: "This operation requires super admin privileges",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      try {
        let requestBody;
        try {
          requestBody = await req.json();
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: "Invalid JSON in request body",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const { oldSecret, newSecret } = requestBody;
        if (!oldSecret || !newSecret) {
          return new Response(
            JSON.stringify({
              error: "Both oldSecret and newSecret are required",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        // Import the security utilities
        const { rotateEncryptionMaterial, rotateHmacMaterial } = await import(
          "../utils/security.js"
        );

        // Perform the rotation
        const encryptionCount = await rotateEncryptionMaterial(
          this.state.storage,
          oldSecret,
          newSecret,
        );
        const hmacCount = await rotateHmacMaterial(
          this.state.storage,
          oldSecret,
          newSecret,
        );

        // Log the sensitive operation
        await logAdminAction(
          adminInfo.keyId,
          "system_rotate_keys",
          {
            encryptionCount,
            hmacCount,
            timestamp: Date.now(),
          },
          this.env,
        );

        return new Response(
          JSON.stringify({
            success: true,
            message: "Encryption and HMAC keys rotated successfully",
            encryptionCount,
            hmacCount,
            timestamp: Date.now(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } catch (error) {
        console.error("Key rotation error:", error);
        return new Response(
          JSON.stringify({
            error: "Key rotation failed",
            message: error.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    });

    // Admin logs route
    this.router.add("GET", "/logs/admin", async (req, ctx) => {
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

      try {
        // Get query parameters
        const url = new URL(req.url);
        const limit = url.searchParams.get("limit")
          ? parseInt(url.searchParams.get("limit"))
          : 50;
        const cursor = url.searchParams.get("cursor") || null;
        const action = url.searchParams.get("action") || null;
        const adminId = url.searchParams.get("adminId") || null;

        // Import the audit logger
        const { getAdminLogs, getActionLogs, getCriticalLogs } = await import(
          "../auth/auditLogger.js"
        );

        let logs;
        if (adminId) {
          logs = await getAdminLogs(adminId, { limit, cursor }, this.env);
        } else if (action) {
          logs = await getActionLogs(action, { limit, cursor }, this.env);
        } else {
          // Default to critical logs
          logs = await getCriticalLogs({ limit, cursor }, this.env);
        }

        return new Response(
          JSON.stringify(logs),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } catch (error) {
        console.error("Error fetching logs:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch logs",
            message: error.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
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
      // Clean up expired keys and rotations
      const cleanupResult = await this.keyManager.cleanupExpiredKeys();
      console.log("Scheduled maintenance completed:", cleanupResult);

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
