import { ListKeysCommand } from "../../../../src/core/keys/commands/ListKeysCommand.js";

describe("ListKeysCommand", () => {
  describe("constructor", () => {
    it("should set default values for limit and offset", () => {
      const command = new ListKeysCommand();

      expect(command.limit).toBe(100);
      expect(command.offset).toBe(0);
    });

    it("should use provided values for limit and offset", () => {
      const command = new ListKeysCommand({ limit: 10, offset: 20 });

      expect(command.limit).toBe(10);
      expect(command.offset).toBe(20);
    });
  });

  describe("validate", () => {
    it("should return valid for valid pagination parameters", () => {
      const command = new ListKeysCommand({ limit: 50, offset: 10 });
      const result = command.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("should return invalid for negative limit", () => {
      const command = new ListKeysCommand({ limit: -1 });
      const result = command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.limit).toBeDefined();
    });

    it("should return invalid for negative offset", () => {
      const command = new ListKeysCommand({ offset: -1 });
      const result = command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.offset).toBeDefined();
    });

    it("should return invalid for too large limit", () => {
      const command = new ListKeysCommand({ limit: 1001 });
      const result = command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.limit).toBeDefined();
    });

    it("should return invalid for non-numeric limit", () => {
      const command = new ListKeysCommand({ limit: "abc" });
      const result = command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.limit).toBeDefined();
    });

    it("should return invalid for non-numeric offset", () => {
      const command = new ListKeysCommand({ offset: "abc" });
      const result = command.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.offset).toBeDefined();
    });
  });
});
