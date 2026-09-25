import { getSession, type SessionPayload } from "@/lib/session";
import type { UserRole } from "@/schemas/userRole";

export const JUDGE_ROLES: UserRole[] = ["THESIS_JUDGE", "EBOOK_JUDGE"];

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

/** Admin-only session check (API routes that manage system config). */
export async function requireAdminSession(): Promise<SessionPayload | null> {
  return requireSession(["ADMIN"]);
}

/** Thesis / e-book judge session check. */
export async function requireJudgeSession(): Promise<SessionPayload | null> {
  return requireSession(JUDGE_ROLES);
}

/** Secretary (and admin) — payment / registration review. */
export async function requireSecretarySession(): Promise<SessionPayload | null> {
  return requireSession(["SECRETARY", "ADMIN"]);
}
