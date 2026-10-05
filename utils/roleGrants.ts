import { sortRoles, type UserRole } from "@/schemas/userRole";
import type { RoleGrant } from "@/schemas/userSchema";

/** Pre-migration documents stored roles as plain strings; only ADMIN survives. */
function normalizeGrant(grant: RoleGrant | string): RoleGrant | null {
  if (typeof grant !== "string") return grant;
  return grant === "ADMIN" ? { role: "ADMIN" } : null;
}

/** Roles a user holds in a competition, including global ones (ADMIN). */
export function rolesForCompetition(
  grants: readonly (RoleGrant | string)[],
  competitionId: string | null | undefined
): UserRole[] {
  const roles = new Set<UserRole>();
  for (const raw of grants) {
    const grant = normalizeGrant(raw);
    if (!grant) continue;
    if (!grant.competition_id || grant.competition_id === competitionId) {
      roles.add(grant.role);
    }
  }
  return sortRoles([...roles]);
}

export function hasGrant(
  grants: readonly (RoleGrant | string)[],
  role: UserRole,
  competitionId: string | null | undefined
): boolean {
  return rolesForCompetition(grants, competitionId).includes(role);
}

/** Mongo filter: users holding any of `roles` in the given competition. */
export function usersWithRolesFilter(roles: UserRole[], competitionId: string) {
  return {
    roles: {
      $elemMatch: { role: { $in: roles }, competition_id: competitionId },
    },
  };
}
