// Mock for Cloudflare Workers types

// Export DurableObject for use in tests
export const DurableObject = global.DurableObject || class DurableObject {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
};
