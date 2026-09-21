import { getSession, type SessionPayload } from "@/lib/session";

export async function requireAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return null;
  }
  return session;
}
