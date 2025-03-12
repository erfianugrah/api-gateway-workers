import { BaseController } from "./BaseController.js";
import { errorResponse, successResponse } from "../../utils/response.js";
import { ValidationError } from "../../core/errors/ApiError.js";
import { isValidApiKey } from "../../utils/validation.js";
import { ValidateKeyCommand } from "../../core/keys/commands/ValidateKeyCommand.js";

/**
 * Controller for API key validation endpoints
 */
export class ValidationController extends BaseController {
  /**
   * Create a new ValidationController
   *
   * @param {Object} services - Service dependencies
   */
  constructor(services) {
    super(services);

    // Bind methods to maintain 'this' context
    this.validateKey = this.handle(this.validateKey);
  }

  /**
   * Validate an API key
   *
   * @param {Request} request - HTTP request
   * @param {Object} context - Request context
   * @returns {Promise<Response>} HTTP response
   */
  async validateKey(request, context) {
    let body;

    try {
      body = await request.json();
    } catch (error) {
      throw new ValidationError("Invalid JSON in request body");
    }

    // Check for API key in headers first (best practice)
    let apiKey = request.headers.get("X-API-Key");

    // Fall back to body if not found in headers
    if (!apiKey && body.key) {
      apiKey = body.key;
    }

    if (!apiKey) {
      throw new ValidationError(
        "API key is required (provide in X-API-Key header or key field in request body)"
      );
    }

    // Basic validation before hitting the database
    if (!isValidApiKey(apiKey)) {
      return successResponse({
        valid: false,
        error: "Invalid API key format",
      });
    }

    const requiredScopes = Array.isArray(body.scopes) ? body.scopes : [];

    // Create command
    const command = new ValidateKeyCommand({
      apiKey,
      requiredScopes,
    });

    // Execute the command
    const result = await this.services.commandBus.execute(command, {});

    // Always return 200 OK for validation requests to prevent information leakage
    // The valid field in the response body indicates if validation passed
    return successResponse(result);
  }
}
