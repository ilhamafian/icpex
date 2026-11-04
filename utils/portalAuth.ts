import { getSession, type SessionPayload } from "@/lib/session";
import {
  ADMIN_ROLES,
  JUDGE_LEADER_ROLES,
  SCORING_JUDGE_ROLES,
  SECRETARIAT_ROLES,
  type UserRole,
} from "@/schemas/userRole";

export const JUDGE_ROLES: UserRole[] = [...SCORING_JUDGE_ROLES];

export async function requireSession(
  allowedRoles?: UserRole[]
): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return null;
  }
  return session;
}

/** Super admin only — competitions, categories, and banners. */
export async function requireSuperAdminSession(): Promise<SessionPayload | null> {
  return requireSession(["SUPER_ADMIN"]);
}

/** Super admin or a track admin. */
export async function requireAdminSession(): Promise<SessionPayload | null> {
  return requireSession(ADMIN_ROLES);
}

/** Scoring judge for the active education track. */
export async function requireJudgeSession(): Promise<SessionPayload | null> {
  return requireSession(SCORING_JUDGE_ROLES);
}

/** Judge leader or super admin — criteria and assignments. */
export async function requireJudgeLeaderSession(): Promise<SessionPayload | null> {
  return requireSession(JUDGE_LEADER_ROLES);
}

/** Secretariat or super admin — payment and registration review. */
export async function requireSecretarySession(): Promise<SessionPayload | null> {
  return requireSession(SECRETARIAT_ROLES);
}
