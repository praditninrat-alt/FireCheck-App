import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { getAssignableRoles } from "@/lib/assignee-roles";

describe("assignable roles", () => {
  it("allows administrators to assign all user roles", () => {
    expect(getAssignableRoles(Role.ADMIN)).toEqual([Role.ADMIN, Role.INSPECTOR, Role.MAINTENANCE]);
  });

  it("allows inspectors to assign inspectors and maintenance users", () => {
    expect(getAssignableRoles(Role.INSPECTOR)).toEqual([Role.INSPECTOR, Role.MAINTENANCE]);
  });

  it("allows maintenance users to assign only maintenance users", () => {
    expect(getAssignableRoles(Role.MAINTENANCE)).toEqual([Role.MAINTENANCE]);
  });
});
