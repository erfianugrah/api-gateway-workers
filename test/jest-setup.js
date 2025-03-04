// We need the Node.js URL object for our mocks
import { URL as NodeURL } from 'url';
global.NodeURL = NodeURL;

// Define expect and other Jest globals
import { expect, afterAll, afterEach, beforeAll, beforeEach, describe, it, jest } from '@jest/globals';
global.expect = expect;
global.afterAll = afterAll;
global.afterEach = afterEach;
global.beforeAll = beforeAll;
global.beforeEach = beforeEach;
global.describe = describe;
global.it = it;
global.jest = jest;

// Set test environment
process.env.NODE_ENV = 'test';

// Import our WebCrypto mock
import './crypto-mock.js';

// Define DurableObject for the test environment
global.DurableObject = class DurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
};