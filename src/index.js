/**
 * API Key Manager with Multi-Admin Support
 * Main entry point
 */

import { KeyManagerDurableObject } from "./lib/KeyManagerDurableObject.js";
import { errorResponse, successResponse } from "./utils/response.js";
import * as auth from "./auth/index.js";

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
        return errorResponse(
          "Service misconfigured: KEY_MANAGER binding not found",
          500,
        );
      }

      const url = new URL(request.url);

      // Quick health check (doesn't hit Durable Object)
      if (url.pathname === "/health") {
        return successResponse({
          status: "healthy",
          version: "1.0.0",
          timestamp: Date.now(),
        }, {
          headers: {
            "Cache-Control": "no-store",
          },
        });
      }

      // Special first-time setup endpoint
      if (url.pathname === "/setup" && request.method === "POST") {
        return handleSetup(request, env);
      }

      // Skip authentication for OPTIONS requests (CORS preflight)
      if (request.method === "OPTIONS") {
        return handleCorsResponse();
      }

      // Skip authentication for the /validate endpoint
      if (url.pathname === "/validate") {
        // Forward to the Durable Object
        const id = env.KEY_MANAGER.idFromName("global");
        const keyManager = env.KEY_MANAGER.get(id);
        return await keyManager.fetch(request.clone());
      }

      // All other endpoints require admin authentication
      if (
        url.pathname.startsWith("/keys") ||
        url.pathname.startsWith("/admin") ||
        url.pathname.startsWith("/logs")
      ) {
        return handleAdminRequest(request, env);
      }

      // Any other path not matched
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("Unhandled worker error:", error);
      return errorResponse("An unexpected error occurred", 500);
    }
  },
};

/**
 * Handle the one-time setup process
 *
 * @param {Request} request - HTTP request
 * @param {Env} env - Environment variables and bindings
 * @returns {Promise<Response>} HTTP response
 */
async function handleSetup(request, env) {
  try {
    // Check if setup has already been completed
    const setupCompleted = await auth.isSetupCompleted(env);

    if (setupCompleted) {
      return errorResponse("Setup has already been completed", 403);
    }

    // Parse admin data from request
    const adminData = await request.json();

    // Validate required fields
    if (!adminData.name || !adminData.email) {
      return errorResponse("Name and email are required", 400);
    }

    // Create the first admin
    const adminKey = await auth.setupFirstAdmin(adminData, env);

    // Return the admin key (only time it's returned)
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
    return errorResponse(`Setup failed: ${error.message}`, 500);
  }
}

/**
 * Handle authenticated admin requests
 *
 * @param {Request} request - HTTP request
 * @param {Env} env - Environment variables and bindings
 * @returns {Promise<Response>} HTTP response
 */
async function handleAdminRequest(request, env) {
  // Extract API key from header
  const apiKey = request.headers.get("X-Api-Key");

  // No API key provided
  if (!apiKey) {
    return errorResponse("Authentication required", 401);
  }

  // Validate the API key
  const result = await auth.validateApiKey(apiKey, [], env);

  // Invalid API key
  if (!result.valid) {
    return errorResponse(result.error || "Invalid API key", 401);
  }

  // Check if key has any admin scopes
  const hasAdminScope = result.scopes.some((scope) =>
    scope.startsWith("admin:")
  );

  if (!hasAdminScope) {
    return errorResponse("This API key lacks administrative permissions", 403);
  }

  // Add admin info to the request
  const adminRequest = new Request(request);
  adminRequest.headers.set("X-Admin-ID", result.keyId);
  adminRequest.headers.set("X-Admin-Email", result.email || "unknown");
  adminRequest.headers.set("X-Admin-Role", result.role || "unknown");

  // Forward to the Durable Object with a consistent ID
  const id = env.KEY_MANAGER.idFromName("global");
  const keyManager = env.KEY_MANAGER.get(id);

  // Add request timeout
  const timeoutMs = 10000; // 10 seconds
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
      return errorResponse("Request timed out", 504);
    }

    console.error("Error forwarding request:", error);
    return errorResponse("An unexpected error occurred", 500);
  }
}

/**
 * Handle CORS preflight requests
 *
 * @returns {Response} CORS response
 */
function handleCorsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
      "Access-Control-Max-Age": "86400",
    },
  });
}
