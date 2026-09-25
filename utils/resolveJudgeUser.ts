import "server-only";

import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import type { User } from "@/schemas/userSchema";
import type { SessionPayload } from "@/lib/session";
import { JUDGE_ROLES } from "@/utils/portalAuth";

export type PortalJudgeUser = {
  _id: string;
  email: string;
  name?: string;
  roles: User["roles"];
};

/** Resolve the DB user for a judge session (username is email). */
export async function resolveJudgeUser(
  session: SessionPayload
): Promise<PortalJudgeUser | null> {
  if (!JUDGE_ROLES.includes(session.role)) {
    return null;
  }

  const user = await new UserModel().findByEmail(session.username.toLowerCase());
  if (!user || user.status !== "ACTIVE") {
    return null;
  }
  if (!user.roles.includes(session.role)) {
    return null;
  }

  return {
    _id: toIdString(user._id),
    email: user.email,
    name: user.name,
    roles: user.roles,
  };
}
