import { getSession, type SessionPayload } from "@/lib/session";
import type { UserRole } from "@/schemas/userRole";

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
