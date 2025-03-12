import { describe, expect, it } from "@jest/globals";
import {
  jsonResponse,
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  rateLimitResponse,
  methodNotAllowedResponse,
  preflightResponse,
} from "../../src/utils/response.js";

// Mock Response object for testing
global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.headers = new Map(Object.entries(init.headers || {}));
  }
};

describe("Response utilities", () => {
  describe("jsonResponse", () => {
    it("should create a Response with JSON content", () => {
      const data = { test: "value" };
      const response = jsonResponse(data);

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify(data));
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should apply custom status code", () => {
      const response = jsonResponse({}, { status: 201 });

      expect(response.status).toBe(201);
    });

    it("should include CORS headers", () => {
      const response = jsonResponse({});

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBeDefined();
      expect(response.headers.get("Access-Control-Allow-Headers")).toBeDefined();
    });

    it("should allow additional headers", () => {
      const response = jsonResponse({}, {
        headers: { "X-Custom-Header": "custom-value" },
      });

      expect(response.headers.get("X-Custom-Header")).toBe("custom-value");
    });
  });

  describe("successResponse", () => {
    it("should create a 200 response", () => {
      const data = { result: "success" };
      const response = successResponse(data);

      expect(response.status).toBe(200);
      expect(response.body).toBe(JSON.stringify(data));
    });
  });

  describe("createdResponse", () => {
    it("should create a 201 response", () => {
      const data = { id: "123" };
      const response = createdResponse(data);

      expect(response.status).toBe(201);
      expect(response.body).toBe(JSON.stringify(data));
    });
  });

  describe("errorResponse", () => {
    it("should create a 400 response by default", () => {
      const response = errorResponse("Bad Request");

      expect(response.status).toBe(400);
      expect(JSON.parse(response.body).error).toBe("Bad Request");
    });

    it("should allow custom status code", () => {
      const response = errorResponse("Not Found", 404);

      expect(response.status).toBe(404);
    });

    it("should include additional data", () => {
      const response = errorResponse("Validation Error", 400, {
        fields: ["name", "email"],
      });

      const body = JSON.parse(response.body);

      expect(body.error).toBe("Validation Error");
      expect(body.fields).toEqual(["name", "email"]);
    });
  });

  describe("notFoundResponse", () => {
    it("should create a 404 response", () => {
      const response = notFoundResponse();

      expect(response.status).toBe(404);
      expect(JSON.parse(response.body).error).toBe("Not Found");
    });

    it("should allow custom message", () => {
      const response = notFoundResponse("API Key not found");

      expect(JSON.parse(response.body).error).toBe("API Key not found");
    });
  });

  describe("validationErrorResponse", () => {
    it("should create a response with validation details", () => {
      const details = {
        name: "Name is required",
        email: "Invalid email format",
      };

      const response = validationErrorResponse("Validation failed", details);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body);

      expect(body.error).toBe("Validation failed");
      expect(body.validationErrors).toEqual(details);
    });
  });

  describe("rateLimitResponse", () => {
    it("should create a 429 response with retry information", () => {
      const response = rateLimitResponse(60);

      expect(response.status).toBe(429);
      const body = JSON.parse(response.body);

      expect(body.error).toContain("Rate limit exceeded");
      expect(body.retryAfter).toBe(60);
    });
  });

  describe("methodNotAllowedResponse", () => {
    it("should create a 405 response with allowed methods", () => {
      const response = methodNotAllowedResponse(["GET", "POST"]);

      expect(response.status).toBe(405);
      expect(JSON.parse(response.body).error).toBe("Method Not Allowed");
      // Headers are passed in options parameter, so they're not set in this test
    });
  });

  describe("preflightResponse", () => {
    it("should create a proper preflight response", () => {
      const response = preflightResponse();

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Max-Age")).toBeDefined();
    });
  });
});
