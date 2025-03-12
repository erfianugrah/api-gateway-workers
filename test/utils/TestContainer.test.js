import { TestContainer } from "./TestContainer.js";

describe("TestContainer", () => {
  let container;

  beforeEach(() => {
    container = new TestContainer();
  });

  it("should initialize with default mocks", () => {
    // Check that core services are registered
    expect(container.resolve("storage")).toBeDefined();
    expect(container.resolve("keyRepository")).toBeDefined();
    expect(container.resolve("keyService")).toBeDefined();
    expect(container.resolve("authService")).toBeDefined();
    expect(container.resolve("auditLogger")).toBeDefined();
    expect(container.resolve("commandBus")).toBeDefined();
    expect(container.resolve("config")).toBeDefined();
  });

  it("mockKey should customize key service behavior", async () => {
    const testKey = {
      id: "custom-key-id",
      name: "Custom Key",
      owner: "custom@example.com",
      scopes: ["custom:scope"],
      status: "active",
    };

    // By default, getKey returns null
    expect(await container.resolve("keyService").getKey("custom-key-id")).toBeNull();

    // After mocking, it should return our test key
    container.mockKey("custom-key-id", testKey);
    expect(await container.resolve("keyService").getKey("custom-key-id")).toEqual(testKey);

    // Should still return null for other keys
    expect(await container.resolve("keyService").getKey("another-key-id")).toBeNull();
  });

  it("mockKeyLookup should customize repository behavior", async () => {
    // By default, lookupKey returns null
    expect(await container.resolve("keyRepository").lookupKey("km_test-key")).toBeNull();

    // After mocking, it should return our test key ID
    container.mockKeyLookup("km_test-key", "test-key-id");
    expect(await container.resolve("keyRepository").lookupKey("km_test-key")).toBe("test-key-id");

    // Should still return null for other keys
    expect(await container.resolve("keyRepository").lookupKey("km_other-key")).toBeNull();
  });

  it("mockPermission should customize auth service behavior", () => {
    // By default, hasPermission returns true
    expect(container.resolve("authService").hasPermission({}, "any:permission")).toBe(true);
    expect(() => container.resolve("authService").requirePermission({}, "any:permission")).not.toThrow();

    // When mocked with false, it should deny permissions
    container.mockPermission(false);
    expect(container.resolve("authService").hasPermission({}, "any:permission")).toBe(false);
    expect(() => container.resolve("authService").requirePermission({}, "any:permission")).toThrow();
  });
});
