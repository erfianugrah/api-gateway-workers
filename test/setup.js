// Mock for Durable Object
class MockDurableObjectState {
  constructor() {
    this.storage = {
      data: new Map(),
      get: jest.fn(async (key) => {
        return this.data.get(key);
      }),
      put: jest.fn(async (key, value) => {
        this.data.set(key, value);
      }),
      delete: jest.fn(async (key) => {
        this.data.delete(key);
      }),
      list: jest.fn(async ({ prefix }) => {
        const results = new Map();
        for (const [key, value] of this.data.entries()) {
          if (key.startsWith(prefix)) {
            results.set(key, value);
          }
        }
        return results;
      })
    };
  }
}

// Mock for Cloudflare crypto
global.crypto = {
  getRandomValues: (buffer) => {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  },
  randomUUID: () => {
    return 'test-uuid-' + Math.floor(Math.random() * 1000);
  }
};

// Mock for Cloudflare DurableObject
class MockDurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
}

export { MockDurableObjectState, MockDurableObject };