import { describe, expect, it } from "vitest";
import { adminPortalRole } from "./auth-session";

describe("Admin portal role boundary", () => {
  it.each([
    "GUARDIAN",
    "ADVISOR",
    "TEACHER",
    "MENTOR",
    "CONTENT_MANAGER",
    "ORGANIZATION_ADMIN",
    "PLATFORM_ADMIN",
  ] as const)("allows the supported %s surface", (role) => {
    expect(adminPortalRole([role])).toBe(role);
  });

  it("rejects Student-only and empty role contexts", () => {
    expect(adminPortalRole(["STUDENT"])).toBeNull();
    expect(adminPortalRole([])).toBeNull();
  });

  it("selects a supported role from a Student plus staff account", () => {
    expect(adminPortalRole(["STUDENT", "ADVISOR"])).toBe("ADVISOR");
  });
});
