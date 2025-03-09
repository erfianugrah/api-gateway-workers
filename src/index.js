import { KeyManagerDurableObject } from "./lib/KeyManagerDurableObject.js";
import { createAuthMiddleware } from "./api/middleware/authMiddleware.js";
import { errorHandler } from "./api/middleware/errorHandler.js";
import { setupContainer } from "./infrastructure/di/setupContainer.js";
import { setupConfig } from "./infrastructure/config/setupConfig.js";
import { ForbiddenError, UnauthorizedError } from "./core/errors/ApiError.js";
import { preflightResponse, successResponse } from "./utils/response.js";
import { AuthService } from "./core/auth/AuthService.js";
import { ApiKeyAdapter } from "./core/auth/adapters/ApiKeyAdapter.js";
import { createApiKey } from "./auth/keyGenerator.js";
import { logAdminAction } from "./auth/auditLogger.js";

// Export the KeyManagerDurableObject
export { KeyManagerDurableObject };

// Main worker
export default {
  /**
   * Main fetch handler for the Worker
   *
   * @param {Request} request - The HTTP request
   * @param {Env} env - Environment bindings
   * @param {ExecutionContext} ctx - Execution context
   * @returns {Promise<Response>} HTTP response
   */
  async fetch(request, env, ctx) {
    try {
      // Check required bindings
      if (!env.KEY_MANAGER) {
        return errorHandler(
          new Error("Service misconfigured: KEY_MANAGER binding not found"),
          request,
        );
      }

      if (!env.KV) {
        return errorHandler(
          new Error("Service misconfigured: KV binding not found"),
          request,
        );
      }

      const url = new URL(request.url);

      // Quick health check (doesn't hit Durable Object)
      if (url.pathname === "/health") {
        return successResponse({
          status: "healthy",
          version: env.VERSION || "1.0.0",
          timestamp: Date.now(),
        }, {
          headers: {
            "Cache-Control": "no-store",
          },
        });
      }

      // Set up config
      const config = setupConfig(env);

      // Special first-time setup endpoint
      if (url.pathname === "/setup" && request.method === "POST") {
        return handleSetup(request, env, config);
      }

      // Skip authentication for OPTIONS requests (CORS preflight)
      if (request.method === "OPTIONS") {
        return preflightResponse();
      }

      // Public endpoint that doesn't require authentication
      if (url.pathname === "/validate") {
        // Forward to the Durable Object
        const id = env.KEY_MANAGER.idFromName("global");
        const keyManager = env.KEY_MANAGER.get(id);
        return await keyManager.fetch(request.clone());
      }

      // All other endpoints require admin authentication
      if (
        url.pathname.startsWith("/keys") ||
        url.pathname.startsWith("/keys-cursor") ||
        url.pathname.startsWith("/admin") ||
        url.pathname.startsWith("/logs") ||
        url.pathname.startsWith("/maintenance")
      ) {
        return handleAdminRequest(request, env, config);
      }

      // Any other path not matched
      return errorHandler(new Error("Not Found"), request);
    } catch (error) {
      console.error("Unhandled worker error:", error);
      return errorHandler(error, request);
    }
  },
};

/**
 * Handle the one-time setup process
 *
 * @param {Request} request - HTTP request
 * @param {Env} env - Environment variables and bindings
 * @param {Config} config - Configuration object
 * @returns {Promise<Response>} HTTP response
 */
async function handleSetup(request, env, config) {
  try {
    // Check if setup has already been completed
    const setupCompleted = await env.KV.get("system:setup_completed");

    if (setupCompleted === "true") {
      return errorHandler(
        new ForbiddenError("Setup has already been completed"),
        request,
      );
    }

    // Parse admin data from request
    let adminData;
    try {
      adminData = await request.json();
    } catch (error) {
      return errorHandler(
        new Error("Invalid JSON in request body"),
        request,
      );
    }

    // Validate required fields
    if (!adminData.name || !adminData.email) {
      return errorHandler(
        new Error("Name and email are required"),
        request,
      );
    }

    // Create the first admin with SUPER_ADMIN role
    const adminKey = await createApiKey({
      name: `${adminData.name} (Super Admin)`,
      owner: adminData.name,
      email: adminData.email,
      role: "SUPER_ADMIN",
      scopes: ["admin:keys:*", "admin:users:*", "admin:system:*"],
      metadata: {
        isFirstAdmin: true,
        setupDate: new Date().toISOString(),
      },
    }, env);

    // Mark setup as completed
    await env.KV.put("system:setup_completed", "true");

    // Log the setup event
    await logAdminAction(
      adminKey.id,
      "system_setup",
      {
        adminName: adminData.name,
        adminEmail: adminData.email,
      },
      env,
      request,
    );

    // Return success
    return successResponse({
      message: "Initial setup completed successfully",
      id: adminKey.id,
      key: adminKey.key, // Only returned during setup
      name: adminKey.name,
      email: adminKey.email,
      role: "SUPER_ADMIN",
      note:
        "IMPORTANT: Save this API key securely. It will never be shown again.",
    }, { status: 201 });
  } catch (error) {
    console.error("Setup error:", error);
    return errorHandler(error, request);
  }
}

/**
 * Handle authenticated admin requests
 *
 * @param {Request} request - HTTP request
 * @param {Env} env - Environment variables and bindings
 * @param {Config} config - Configuration object
 * @returns {Promise<Response>} HTTP response
 */
async function handleAdminRequest(request, env, config) {
  try {
    // Extract API key from header
    const apiKey = request.headers.get("X-Api-Key");

    // No API key provided
    if (!apiKey) {
      return errorHandler(
        new UnauthorizedError("Authentication required"),
        request,
      );
    }

    // Create key service adapter for validation
    const keyAdapter = new ApiKeyAdapter(env.KV);

    // Create auth service
    const authService = new AuthService(keyAdapter, { hasPermission });

    // Validate the API key
    const auth = await authService.authenticate(apiKey);

    // If not authorized, return the error
    if (!auth.authenticated) {
      return errorHandler(
        new UnauthorizedError(auth.error || "Authentication failed"),
        request,
      );
    }

    // Add admin info to the request
    const adminRequest = new Request(request);
    adminRequest.headers.set("X-Admin-ID", auth.admin.keyId);
    adminRequest.headers.set(
      "X-Admin-Email",
      auth.admin.email || "unknown",
    );
    adminRequest.headers.set(
      "X-Admin-Role",
      auth.admin.role || "unknown",
    );

    // Forward to the Durable Object with a consistent ID
    const id = env.KEY_MANAGER.idFromName("global");
    const keyManager = env.KEY_MANAGER.get(id);

    // Add request timeout
    const timeoutMs = config.get("requestTimeout", 10000); // 10 seconds default
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await keyManager.fetch(adminRequest, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        return errorHandler(
          new Error("Request timed out"),
          request,
        );
      }

      console.error("Error forwarding request:", error);
      return errorHandler(error, request);
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return errorHandler(error, request);
  }
}

/**
 * Check if an admin has a specific permission
 *
 * @param {Object} admin - Admin object with scopes
 * @param {string} permission - Required permission
 * @returns {boolean} True if admin has permission
 */
function hasPermission(admin, permission) {
  if (!admin || !admin.scopes) {
    return false;
  }

  // Normalize required permission to lowercase for case-insensitive checks
  const normalizedRequired = permission.toLowerCase();

  // Check each scope in the admin key
  for (const scope of admin.scopes) {
    // Normalize to lowercase
    const normalizedScope = scope.toLowerCase();

    // Direct match - the admin has exactly this permission
    if (normalizedScope === normalizedRequired) {
      return true;
    }

    // Wildcard match at the end (e.g., "admin:keys:*")
    if (normalizedScope.endsWith(":*")) {
      // Get the base scope (everything before the "*")
      const baseScope = normalizedScope.slice(0, -1);

      // If the required permission starts with this base, it's a match
      if (normalizedRequired.startsWith(baseScope)) {
        return true;
      }
    }

    // Full wildcard (e.g., "admin:*") - super admin case
    if (normalizedScope === "admin:*") {
      // If the required permission starts with "admin:", it's a match
      if (normalizedRequired.startsWith("admin:")) {
        return true;
      }
    }
  }

  return false;
}
