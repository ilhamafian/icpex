import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { getHomePathForRole } from "@/utils/portalHome";

/** Role-aware entry: send each staff role to their home section. */
export default async function PortalIndexPage() {
  const session = await getSession();
  if (!session) {
    redirect("/portal/login");
  }
  redirect(getHomePathForRole(session.role));
}
