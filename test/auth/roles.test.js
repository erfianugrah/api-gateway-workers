import { describe, expect, it } from "@jest/globals";
import {
  ADMIN_ROLES,
  hasPermission,
  PERMISSION_SCOPES,
} from "../../src/auth/roles.js";

describe("Role-based permissions", () => {
  describe("hasPermission", () => {
    it("should allow exact permission matches", () => {
      const adminKey = {
        scopes: ["admin:keys:read", "admin:users:create"],
      };

      expect(hasPermission(adminKey, "admin:keys:read")).toBe(true);
      expect(hasPermission(adminKey, "admin:users:create")).toBe(true);
      expect(hasPermission(adminKey, "admin:system:logs")).toBe(false);
    });

    it("should handle wildcard permissions", () => {
      const adminKey = {
        scopes: ["admin:keys:*", "admin:users:read"],
      };

      expect(hasPermission(adminKey, "admin:keys:read")).toBe(true);
      expect(hasPermission(adminKey, "admin:keys:create")).toBe(true);
      expect(hasPermission(adminKey, "admin:keys:revoke")).toBe(true);
      expect(hasPermission(adminKey, "admin:users:read")).toBe(true);
      expect(hasPermission(adminKey, "admin:users:create")).toBe(false);
      expect(hasPermission(adminKey, "admin:system:logs")).toBe(false);
    });

    it("should handle superadmin permissions", () => {
      const adminKey = {
        scopes: ["admin:*"],
      };

      expect(hasPermission(adminKey, "admin:keys:read")).toBe(true);
      expect(hasPermission(adminKey, "admin:users:create")).toBe(true);
      expect(hasPermission(adminKey, "admin:system:logs")).toBe(true);
    });

    it("should return false for invalid inputs", () => {
      expect(hasPermission(null, "admin:keys:read")).toBe(false);
      expect(hasPermission({}, "admin:keys:read")).toBe(false);
      expect(hasPermission({ scopes: null }, "admin:keys:read")).toBe(false);
    });

    it("should handle permission hierarchy correctly", () => {
      const adminKey = {
        scopes: ["admin:keys:read"],
      };

      // More specific permission is needed
      expect(hasPermission(adminKey, "admin:keys")).toBe(false);

      // Should match exact permissions only
      expect(hasPermission(adminKey, "admin:keys:read:something")).toBe(false);
    });

    it("should handle case sensitivity correctly", () => {
      const adminKey = {
        scopes: ["admin:keys:READ", "admin:USERS:create"],
      };

      // Permission checking should be case insensitive
      expect(hasPermission(adminKey, "admin:keys:read")).toBe(true);
      expect(hasPermission(adminKey, "ADMIN:KEYS:READ")).toBe(true);
      expect(hasPermission(adminKey, "admin:users:CREATE")).toBe(true);
    });
  });

  describe("ADMIN_ROLES", () => {
    it("should define all required roles", () => {
      expect(ADMIN_ROLES.SUPER_ADMIN).toBeDefined();
      expect(ADMIN_ROLES.KEY_ADMIN).toBeDefined();
      expect(ADMIN_ROLES.KEY_VIEWER).toBeDefined();
      expect(ADMIN_ROLES.USER_ADMIN).toBeDefined();
      expect(ADMIN_ROLES.SUPPORT).toBeDefined();
      expect(ADMIN_ROLES.CUSTOM).toBeDefined();
    });

    it("should have appropriate scopes for each role", () => {
      // Super admin should have all permissions
      expect(ADMIN_ROLES.SUPER_ADMIN.scopes).toContain("admin:keys:*");
      expect(ADMIN_ROLES.SUPER_ADMIN.scopes).toContain("admin:users:*");
      expect(ADMIN_ROLES.SUPER_ADMIN.scopes).toContain("admin:system:*");

      // Key admin should have key management permissions
      expect(ADMIN_ROLES.KEY_ADMIN.scopes).toContain("admin:keys:create");
      expect(ADMIN_ROLES.KEY_ADMIN.scopes).toContain("admin:keys:read");
      expect(ADMIN_ROLES.KEY_ADMIN.scopes).toContain("admin:keys:revoke");

      // Key viewer should only have read permission
      expect(ADMIN_ROLES.KEY_VIEWER.scopes).toContain("admin:keys:read");
      expect(ADMIN_ROLES.KEY_VIEWER.scopes).not.toContain("admin:keys:create");

      // User admin should have user management permissions
      expect(ADMIN_ROLES.USER_ADMIN.scopes).toContain("admin:users:create");
      expect(ADMIN_ROLES.USER_ADMIN.scopes).toContain("admin:users:read");
      expect(ADMIN_ROLES.USER_ADMIN.scopes).toContain("admin:users:revoke");

      // Support role should have limited read permissions
      expect(ADMIN_ROLES.SUPPORT.scopes).toContain("admin:keys:read");
      expect(ADMIN_ROLES.SUPPORT.scopes).toContain("admin:users:read");
      expect(ADMIN_ROLES.SUPPORT.scopes).not.toContain("admin:keys:create");
      expect(ADMIN_ROLES.SUPPORT.scopes).not.toContain("admin:system:*");

      // Custom role should have empty scopes array (to be filled during creation)
      expect(ADMIN_ROLES.CUSTOM.scopes).toEqual([]);
    });

    it("should include name and description for each role", () => {
      // Check that each role has a name and description
      for (const [roleName, role] of Object.entries(ADMIN_ROLES)) {
        expect(role.name).toBeDefined();
        expect(role.description).toBeDefined();
      }
    });
  });

  describe("PERMISSION_SCOPES", () => {
    it("should define all required permission scopes", () => {
      // Check key management permissions
      expect(PERMISSION_SCOPES["admin:keys:create"]).toBeDefined();
      expect(PERMISSION_SCOPES["admin:keys:read"]).toBeDefined();
      expect(PERMISSION_SCOPES["admin:keys:update"]).toBeDefined();
      expect(PERMISSION_SCOPES["admin:keys:revoke"]).toBeDefined();
      expect(PERMISSION_SCOPES["admin:keys:*"]).toBeDefined();

      // Check user management permissions
      expect(PERMISSION_SCOPES["admin:users:create"]).toBeDefined();
      expect(PERMISSION_SCOPES["admin:users:read"]).toBeDefined();
      expect(PERMISSION_SCOPES["admin:users:update"]).toBeDefined();
      expect(PERMISSION_SCOPES["admin:users:revoke"]).toBeDefined();
      expect(PERMISSION_SCOPES["admin:users:*"]).toBeDefined();

      // Check system management permissions
      expect(PERMISSION_SCOPES["admin:system:logs"]).toBeDefined();
      expect(PERMISSION_SCOPES["admin:system:config"]).toBeDefined();
      expect(PERMISSION_SCOPES["admin:system:*"]).toBeDefined();
    });

    it("should provide descriptive text for each permission", () => {
      // Each permission should have a meaningful description
      for (
        const [permission, description] of Object.entries(PERMISSION_SCOPES)
      ) {
        expect(typeof description).toBe("string");
        expect(description.length).toBeGreaterThan(5); // At least a minimal description
      }
    });
  });

  describe("Role permission coverage", () => {
    it("should ensure roles have valid permissions", () => {
      // All permissions in each role should be defined in PERMISSION_SCOPES
      for (const [roleName, role] of Object.entries(ADMIN_ROLES)) {
        if (roleName === "CUSTOM") continue; // Skip CUSTOM role as it has empty scopes

        for (const scope of role.scopes) {
          // For wildcard scopes, check the base permission
          if (scope.endsWith("*")) {
            const baseScope = scope.substring(0, scope.length - 1);
            // At least one permission should start with the base scope
            const matchingPermissions = Object.keys(PERMISSION_SCOPES).some(
              (p) => p.startsWith(baseScope)
            );

            expect(matchingPermissions).toBe(true);
          } else {
            // Direct permission should be defined
            expect(PERMISSION_SCOPES[scope]).toBeDefined();
          }
        }
      }
    });
  });
});
