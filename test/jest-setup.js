// Import crypto mock
import "./crypto-mock.js";

// We need the Node.js URL object for our mocks
import { URL as NodeURL } from "url";
global.NodeURL = NodeURL;

// Define expect and other Jest globals
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
global.expect = expect;
global.afterAll = afterAll;
global.afterEach = afterEach;
global.beforeAll = beforeAll;
global.beforeEach = beforeEach;
global.describe = describe;
global.it = it;
global.jest = jest;

// Mock validation functions
jest.mock("../src/utils/validation.js", () => ({
  isValidApiKey: jest.fn(key => key.startsWith("km_")),
  validateCreateKeyParams: jest.fn(params => {
    if (!params.name) throw new Error("Name is required");
    if (!params.owner) throw new Error("Owner is required");

    return params;
  }),
  validateApiKey: jest.fn(),
}));

// Mock audit logger
jest.mock("../src/auth/auditLogger.js", () => ({
  logAdminAction: jest.fn(),
  logValidation: jest.fn(),
}));

// Set test environment
process.env.NODE_ENV = "test";

// Define DurableObject for the test environment
global.DurableObject = class DurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
};

// Mock TextEncoder and TextDecoder if needed
if (typeof TextEncoder === "undefined") {
  global.TextEncoder = class TextEncoder {
    encode(text) {
      const buf = Buffer.from(text);

      return new Uint8Array(buf);
    }
  };
}

if (typeof TextDecoder === "undefined") {
  global.TextDecoder = class TextDecoder {
    decode(buffer) {
      return Buffer.from(buffer).toString();
    }
  };
}

// Add mock Response if needed
if (typeof Response === "undefined") {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = new Map(Object.entries(init.headers || {}));
      this.statusText = init.statusText || "";

      this.json = async () => {
        if (typeof body === "string") {
          return JSON.parse(body);
        }

        return body;
      };

      this.text = async () => {
        if (typeof body === "string") {
          return body;
        }

        return JSON.stringify(body);
      };

      this.clone = () => new Response(this.body, init);
    }
  };
}

// Add mock Request if needed
if (typeof Request === "undefined") {
  global.Request = class Request {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || "GET";

      const headerMap = new Map(Object.entries(init.headers || {}));

      this.headers = {
        get: (name) => headerMap.get(name),
        has: (name) => headerMap.has(name),
        set: (name, value) => headerMap.set(name, value),
        append: (name, value) => {
          const current = headerMap.get(name);

          if (current) {
            headerMap.set(name, `${current}, ${value}`);
          } else {
            headerMap.set(name, value);
          }
        },
        delete: (name) => headerMap.delete(name),
        entries: () => headerMap.entries(),
      };

      this.body = init.body || null;

      if (this.body) {
        this.json = async () => {
          if (typeof this.body === "string") {
            return JSON.parse(this.body);
          }

          return this.body;
        };

        this.text = async () => {
          if (typeof this.body === "string") {
            return this.body;
          }

          return JSON.stringify(this.body);
        };
      }

      this.clone = () => new Request(this.url, {
        method: this.method,
        headers: Object.fromEntries(headerMap.entries()),
        body: this.body,
      });
    }
  };
}

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    status: 200,
    headers: new Map(),
  })
);
