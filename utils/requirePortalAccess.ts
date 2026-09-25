import { redirect } from "next/navigation";

import { requireSession } from "@/utils/portalAuth";
import { getHomePathForRole } from "@/utils/portalHome";
import {
  canAccessSection,
  type PortalSection,
} from "@/utils/portalNav";
import type { SessionPayload } from "@/lib/session";
import type { UserRole } from "@/schemas/userRole";

/** Require a session with one of the allowed roles; redirect otherwise. */
export async function requirePortalAccess(
  allowedRoles: UserRole[]
): Promise<SessionPayload> {
  const session = await requireSession(allowedRoles);
  if (!session) {
    const anySession = await requireSession();
    if (!anySession) {
      redirect("/portal/login");
    }
    redirect(getHomePathForRole(anySession.role));
  }
  return session;
}

/** Require access to a nav section; redirect to the user's home if denied. */
export async function requirePortalSection(
  section: PortalSection
): Promise<SessionPayload> {
  const session = await requireSession();
  if (!session) {
    redirect("/portal/login");
  }
  if (!canAccessSection(session.role, section)) {
    redirect(getHomePathForRole(session.role));
  }
  return session;
}
