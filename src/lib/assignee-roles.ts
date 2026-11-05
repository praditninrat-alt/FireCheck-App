import { Role } from "@prisma/client";

export function getAssignableRoles(role: Role): Role[] {
  switch (role) {
    case Role.ADMIN:
      return [Role.ADMIN, Role.INSPECTOR, Role.MAINTENANCE];
    case Role.INSPECTOR:
      return [Role.INSPECTOR, Role.MAINTENANCE];
    case Role.MAINTENANCE:
      return [Role.MAINTENANCE];
  }
}
