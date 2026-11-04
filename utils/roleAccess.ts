import "server-only";

import type { SessionPayload } from "@/lib/session";
import { UserModel } from "@/models/User";
import type { RoleGrant } from "@/schemas/userSchema";
import {
  isGlobalRole,
  rolesGrantableBy,
  type UserRole,
} from "@/schemas/userRole";
import { hasGrant } from "@/utils/roleGrants";

/** Why this actor cannot grant `role`, or null when the grant is allowed. */
export async function grantDenied(
  session: SessionPayload,
  role: UserRole,
  competitionId: string | undefined
): Promise<string | null> {
  if (!rolesGrantableBy(session.role).includes(role)) {
    return "You cannot assign that role.";
  }
  if (isGlobalRole(role)) return null;
  if (!competitionId) return "Choose the competition this role is for.";
  if (session.role === "SUPER_ADMIN") return null;

  const actor = await new UserModel().findByEmail(session.username.toLowerCase());
  if (!actor || !hasGrant(actor.roles, session.role, competitionId)) {
    return "You can only assign roles for competitions you administer.";
  }
  return null;
}

/** Track admins cannot delete or rewrite users who hold another track. */
export async function targetUserDenied(
  session: SessionPayload,
  roles: readonly RoleGrant[]
): Promise<string | null> {
  if (session.role === "SUPER_ADMIN") return null;

  const allowed = new Set(rolesGrantableBy(session.role));
  const actor = await new UserModel().findByEmail(session.username.toLowerCase());
  if (!actor) return "You cannot change this user.";

  for (const grant of roles) {
    if (!allowed.has(grant.role)) {
      return "You cannot change a user outside your track.";
    }
    if (
      !isGlobalRole(grant.role) &&
      !hasGrant(actor.roles, session.role, grant.competition_id)
    ) {
      return "You cannot change a user outside your competitions.";
    }
  }
  return null;
}
