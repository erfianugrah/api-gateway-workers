import { Container } from "./Container.js";
import { DurableObjectRepository } from "../storage/DurableObjectRepository.js";
import { AuthService } from "../../core/auth/AuthService.js";
import { ApiKeyManager } from "../../models/ApiKeyManager.js";
import { KeyServiceAdapter } from "../../core/keys/adapters/KeyServiceAdapter.js";
import { CommandBus } from "../../core/command/CommandBus.js";
import { CreateKeyHandler } from "../../core/keys/handlers/CreateKeyHandler.js";
import { RevokeKeyHandler } from "../../core/keys/handlers/RevokeKeyHandler.js";
import { RotateKeyHandler } from "../../core/keys/handlers/RotateKeyHandler.js";
import { ValidateKeyHandler } from "../../core/keys/handlers/ValidateKeyHandler.js";
import { GetKeyHandler } from "../../core/keys/handlers/GetKeyHandler.js";
import { ListKeysHandler } from "../../core/keys/handlers/ListKeysHandler.js";
import { ListKeysWithCursorHandler } from "../../core/keys/handlers/ListKeysWithCursorHandler.js";
import { CleanupExpiredKeysHandler } from "../../core/keys/handlers/CleanupExpiredKeysHandler.js";
import { setupConfig } from "../config/setupConfig.js";
import { KeysController } from "../../api/controllers/KeysController.js";
import { ValidationController } from "../../api/controllers/ValidationController.js";
import { SystemController } from "../../api/controllers/SystemController.js";
import { EncryptionService } from "../../core/security/EncryptionService.js";
import { HmacService } from "../../core/security/HmacService.js";
import { KeyGenerator } from "../../core/security/KeyGenerator.js";
import { RateLimiter } from "../../core/security/RateLimiter.js";
import { AuditLogger } from "../../core/audit/AuditLogger.js";
import { ProxyService } from "../../core/proxy/ProxyService.js";
import { createCorsMiddleware } from "../../api/middleware/corsMiddleware.js";
import { createResponseMiddleware } from "../../api/middleware/responseMiddleware.js";
import { createErrorHandler } from "../../api/middleware/errorHandler.js";
import { Logger } from "../logging/Logger.js";

/**
 * Set up the dependency injection container
 *
 * @param {DurableObjectState} state - Durable Object state
 * @param {Object} env - Environment variables
 * @returns {Container} Configured DI container
 */
export function setupContainer(state, env) {
  const container = new Container();

  // Register configuration
  container.register("config", () => setupConfig(env));
  
  // Register logger
  container.register("logger", (c) => new Logger(c.resolve("config")));

  // Register security services
  container.register("encryptionService", (c) => {
    const config = c.resolve("config");
    return new EncryptionService(
      config.get("encryption.key"),
      config.get("env") === "test",
    );
  });

  container.register("hmacService", (c) => {
    const config = c.resolve("config");
    return new HmacService(
      config.get("hmac.secret"),
      config.get("env") === "test",
    );
  });

  container.register("keyGenerator", (c) => {
    const config = c.resolve("config");
    return new KeyGenerator(config.get("keys.prefix", "km_"));
  });

  container.register("rateLimiter", (c) => {
    const config = c.resolve("config");
    return new RateLimiter(state.storage, config.get("rateLimit", {}));
  });

  // Register legacy components
  container.register(
    "apiKeyManager",
    () => new ApiKeyManager(state.storage, env),
  );

  // Register repositories
  container.register(
    "keyRepository",
    () => new DurableObjectRepository(state.storage),
  );

  // Register services
  container.register("keyService", (c) => {
    // Use an adapter to wrap the existing ApiKeyManager
    return new KeyServiceAdapter(c.resolve("apiKeyManager"));
  });

  // Register audit logger
  container.register("auditLogger", () => new AuditLogger(state.storage));
  
  // Register proxy service
  container.register("proxyService", (c) => {
    return new ProxyService(c.resolve("config"));
  });

  // Register auth service
  container.register("authService", (c) => {
    const config = c.resolve("config");
    return new AuthService(c.resolve("keyService"), {
      hasPermission: (admin, permission) => {
        if (!admin || !admin.scopes) return false;

        // Normalize required permission to lowercase for case-insensitive checks
        const normalizedRequired = permission.toLowerCase();

        // Check each scope in the admin key
        for (const scope of admin.scopes) {
          // Normalize to lowercase
          const normalizedScope = scope.toLowerCase();

          // Direct match
          if (normalizedScope === normalizedRequired) {
            return true;
          }

          // Wildcard match
          if (normalizedScope.endsWith(":*")) {
            const baseScope = normalizedScope.slice(0, -1);
            if (normalizedRequired.startsWith(baseScope)) {
              return true;
            }
          }

          // Full admin wildcard
          if (
            normalizedScope === "admin:*" &&
            normalizedRequired.startsWith("admin:")
          ) {
            return true;
          }
        }

        return false;
      },
    }, config);
  });

  // Register command handlers
  container.register(
    "createKeyHandler",
    (c) =>
      new CreateKeyHandler(c.resolve("keyService"), c.resolve("auditLogger")),
  );

  container.register(
    "revokeKeyHandler",
    (c) =>
      new RevokeKeyHandler(c.resolve("keyService"), c.resolve("auditLogger")),
  );

  container.register(
    "rotateKeyHandler",
    (c) =>
      new RotateKeyHandler(c.resolve("keyService"), c.resolve("auditLogger")),
  );

  container.register(
    "validateKeyHandler",
    (c) => new ValidateKeyHandler(c.resolve("keyService")),
  );

  container.register(
    "getKeyHandler",
    (c) =>
      new GetKeyHandler(c.resolve("keyService"), c.resolve("auditLogger")),
  );

  container.register(
    "listKeysHandler",
    (c) =>
      new ListKeysHandler(c.resolve("keyService"), c.resolve("auditLogger")),
  );

  container.register(
    "listKeysWithCursorHandler",
    (c) =>
      new ListKeysWithCursorHandler(c.resolve("keyService"), c.resolve("auditLogger")),
  );

  container.register(
    "cleanupExpiredKeysHandler",
    (c) =>
      new CleanupExpiredKeysHandler(c.resolve("keyService"), c.resolve("auditLogger")),
  );

  // Register command bus
  container.register("commandBus", (c) => {
    return new CommandBus([
      c.resolve("createKeyHandler"),
      c.resolve("revokeKeyHandler"),
      c.resolve("rotateKeyHandler"),
      c.resolve("validateKeyHandler"),
      c.resolve("getKeyHandler"),
      c.resolve("listKeysHandler"),
      c.resolve("listKeysWithCursorHandler"),
      c.resolve("cleanupExpiredKeysHandler"),
    ]);
  });

  // Register middleware
  container.register("corsMiddleware", (c) => {
    const config = c.resolve("config");
    return createCorsMiddleware({ config });
  });

  container.register("responseMiddleware", (c) => {
    const config = c.resolve("config");
    return createResponseMiddleware({
      config,
      cors: config.get("security.cors", {}),
      security: config.get("security.headers", {}),
    });
  });
  
  container.register("errorHandler", (c) => {
    return createErrorHandler(c.resolve("logger"));
  });

  // Register controllers
  container.register("keysController", (c) => {
    return new KeysController({
      keyService: c.resolve("keyService"),
      authService: c.resolve("authService"),
      commandBus: c.resolve("commandBus"),
      auditLogger: c.resolve("auditLogger"),
      config: c.resolve("config"),
    });
  });

  container.register("validationController", (c) => {
    return new ValidationController({
      keyService: c.resolve("keyService"),
      config: c.resolve("config"),
    });
  });

  container.register("systemController", (c) => {
    return new SystemController({
      keyService: c.resolve("keyService"),
      authService: c.resolve("authService"),
      auditLogger: c.resolve("auditLogger"),
      config: c.resolve("config"),
    });
  });

  return container;
}