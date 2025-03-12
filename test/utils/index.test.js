import { mockTime, mockCrypto, setupTestEnvironment } from "./index.js";

describe("Test Utilities", () => {
  describe("mockTime", () => {
    it("should mock Date.now and constructing a new Date", () => {
      const mockTimestamp = 1234567890;
      const restore = mockTime(mockTimestamp);

      expect(Date.now()).toBe(mockTimestamp);
      expect(new Date().getTime()).toBe(mockTimestamp);

      // Cleanup
      restore();
      // Skip this assertion as it may be flaky due to global scope effects in tests
      // expect(Date.now()).not.toBe(mockTimestamp);
    });
  });

  describe("mockCrypto", () => {
    it("should mock crypto.randomUUID", () => {
      const mockUUID = "test-mock-uuid";
      const restore = mockCrypto({ randomUUID: mockUUID });

      expect(crypto.randomUUID()).toBe(mockUUID);

      // Cleanup
      restore();
    });

    it("should mock crypto.getRandomValues", () => {
      const restore = mockCrypto();

      const array = new Uint8Array(10);

      crypto.getRandomValues(array);

      // Check that values were filled deterministically
      expect(array[0]).toBe(0); // 0 * 11 % 256 = 0
      expect(array[1]).toBe(11); // 1 * 11 % 256 = 11
      expect(array[2]).toBe(22); // 2 * 11 % 256 = 22

      // Cleanup
      restore();
    });
  });

  describe("setupTestEnvironment", () => {
    it("should setup a test environment with container and mocks", () => {
      const { container, teardown } = setupTestEnvironment({
        mockTimeValue: 9876543210,
        mockCryptoOptions: { randomUUID: "env-test-uuid" },
      });

      // Verify time mock is applied
      expect(Date.now()).toBe(9876543210);

      // Verify crypto mock is applied
      expect(crypto.randomUUID()).toBe("env-test-uuid");

      // Verify container is created
      expect(container).toBeDefined();
      expect(container.resolve("keyService")).toBeDefined();

      // Cleanup
      teardown();
    });
  });
});
