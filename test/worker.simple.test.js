import { describe, expect, it } from '@jest/globals';
import workerDefault from '../src/index.js';

describe('Worker', () => {
  // Simple test to verify the worker exports what we expect
  it('should export a fetch handler', () => {
    expect(workerDefault).toBeDefined();
    expect(workerDefault.fetch).toBeDefined();
    expect(typeof workerDefault.fetch).toBe('function');
  });
});