import { setupContainer } from "../infrastructure/di/setupContainer.js";
import { Router } from "../infrastructure/http/Router.js";
import { createAuthMiddleware } from "../api/middleware/authMiddleware.js";
import { preflightResponse } from "../utils/response.js";
import { getClientIp } from "../utils/security.js";

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

    // Set up dependency injection container
    this.container = setupContainer(state, env);

    // Initialize services
    this.keyService = this.container.resolve("keyService");
    this.authService = this.container.resolve("authService");
    this.config = this.container.resolve("config");

    // Get controllers
    this.keysController = this.container.resolve("keysController");
    this.validationController = this.container.resolve("validationController");
    this.systemController = this.container.resolve("systemController");

    // Initialize router with config
    this.router = new Router(this.config);

    // Register routes
    this.setupRoutes();

    // Set up periodic cleanup
    this.setupMaintenance();
  }

  /**
   * Set up route handlers
   */
  setupRoutes() {
    // CORS preflight handler
    this.router.add("OPTIONS", "/*", (req) => {
      return preflightResponse();
    });

    // Create auth middleware
    const auth = (permission) =>
      createAuthMiddleware(this.authService, permission);

    // System routes
    this.router.add("GET", "/health", this.systemController.getHealth);
    this.router.add(
      "POST",
      "/maintenance/cleanup",
      auth("admin:system:maintenance"),
      this.systemController.runCleanup,
    );

    // Key validation route (public)
    this.router.add("POST", "/validate", this.validationController.validateKey);

    // Key management routes
    this.router.add(
      "GET",
      "/keys",
      auth("admin:keys:read"),
      this.keysController.listKeys,
    );

    // API Versioning using config
    this.router.addVersioned(
      "GET",
      "/keys",
      auth("admin:keys:read"),
      this.keysController.listKeys,
    );

    this.router.add(
      "POST",
      "/keys",
      auth("admin:keys:create"),
      this.keysController.createKey,
    );

    // Enhanced Key ID validation using config patterns
    this.router.addValidated(
      "GET",
      "/keys/:id",
      "id",
      "id",
      auth("admin:keys:read"),
      this.keysController.getKey,
    );

    // Delete key route with validated ID and versioning
    this.router.addVersionedValidated(
      "DELETE",
      "/keys/:id",
      "id",
      "id",
      auth("admin:keys:revoke"),
      this.keysController.revokeKey,
    );

    this.router.add(
      "POST",
      "/keys/:id/rotate",
      auth("admin:keys:update"),
      this.keysController.rotateKey,
    );

    // Add filtering by status with validated parameter
    this.router.addValidated(
      "GET",
      "/keys/filter/status/:status",
      "status",
      "status",
      auth("admin:keys:read"),
      this.keysController.listKeys,
    );

    // Cursor-based pagination
    this.router.add(
      "GET",
      "/keys-cursor",
      auth("admin:keys:read"),
      this.keysController.listKeysWithCursor,
    );

    // Admin log routes
    this.router.add(
      "GET",
      "/logs/admin",
      auth("admin:system:logs"),
      this.systemController.getAdminLogs,
    );
    
    // Log filtering by date with validated parameter
    this.router.addValidated(
      "GET",
      "/logs/admin/:date",
      "date",
      "date",
      auth("admin:system:logs"),
      this.systemController.getAdminLogs,
    );
  }

  /**
   * Set up periodic maintenance tasks
   */
  setupMaintenance() {
    // Make sure setAlarm is supported (may not be in local dev environment)
    if (typeof this.state.setAlarm === "function") {
      // Calculate alarm time from config
      const cleanupIntervalHours = this.config.get(
        "maintenance.cleanupIntervalHours",
        24,
      );
      const alarmTime = Date.now() + cleanupIntervalHours * 60 * 60 * 1000;

      // Set up alarm for cleanup
      this.state.setAlarm(alarmTime);
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
      const cleanupResult = await this.keyService.cleanupExpiredKeys();
      console.log("Scheduled maintenance completed:", cleanupResult);

      // Schedule next alarm using config
      if (typeof this.state.setAlarm === "function") {
        const cleanupIntervalHours = this.config.get(
          "maintenance.cleanupIntervalHours",
          24,
        );
        this.state.setAlarm(Date.now() + cleanupIntervalHours * 60 * 60 * 1000);
      }
    } catch (error) {
      console.error("Error in alarm handler:", error);

      // Retry sooner if there was an error
      if (typeof this.state.setAlarm === "function") {
        const retryIntervalHours = this.config.get(
          "maintenance.retryIntervalHours",
          1,
        );
        this.state.setAlarm(Date.now() + retryIntervalHours * 60 * 60 * 1000);
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
    try {
      // Add context for handlers
      const context = {
        storage: this.state.storage,
        env: this.env,
        services: {
          proxyService: this.container.resolve("proxyService"),
          logger: this.container.resolve("logger"),
          errorHandler: this.container.resolve("errorHandler")
        }
      };

      // If rate limiting is available, apply it
      if (this.container.has("rateLimiter")) {
        try {
          const rateLimiter = this.container.resolve("rateLimiter");
          const clientIp = getClientIp(request);
          const path = new URL(request.url).pathname;

          const rateLimit = await rateLimiter.checkLimit(clientIp, path);

          // Add rate limit headers to context
          context.rateLimit = {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(rateLimit.reset / 1000).toString(),
          };
        } catch (error) {
          // If rate limited, return appropriate response
          if (error.name === "RateLimitError") {
            return this.container.resolve("errorHandler")(error, request);
          }

          // Otherwise just log the error and continue
          const logger = this.container.resolve("logger");
          logger.error("Rate limiting error", { error, path: new URL(request.url).pathname });
        }
      }

      return await this.router.handle(request, context);
    } catch (error) {
      // Use the error handler for standardized error responses
      return this.container.resolve("errorHandler")(error, request);
    }
  }
}
