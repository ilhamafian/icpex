"use server";

import { redirect } from "next/navigation";

import { portalLoginSchema } from "@/schemas/auth";
import { userRoleSchema } from "@/schemas/userRole";
import { verifyPassword } from "@/lib/password";
import {
  createSession,
  deleteSession,
  getSession,
  verifyEnvAdminCredentials,
} from "@/lib/session";
import { UserModel } from "@/models/User";
import { getCurrentCompetitionId } from "@/utils/currentCompetition";
import { getHomePathForRole } from "@/utils/portalHome";
import { rolesForCompetition } from "@/utils/roleGrants";

export type PortalLoginState = {
  error?: string;
  fieldErrors?: {
    username?: string[];
    password?: string[];
  };
};

export async function portalLogin(
  _prevState: PortalLoginState,
  formData: FormData
): Promise<PortalLoginState> {
  const validated = portalLoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { username, password } = validated.data;

  if (verifyEnvAdminCredentials(username, password)) {
    await createSession(username, "ADMIN", { source: "env" });
    redirect(getHomePathForRole("ADMIN"));
  }

  const user = await new UserModel().findByEmail(username.toLowerCase());
  if (!user || user.status !== "ACTIVE" || !user.password_hash) {
    return { error: "Invalid credentials." };
  }

  const passwordOk = await verifyPassword(password, user.password_hash);
  if (!passwordOk) {
    return { error: "Invalid credentials." };
  }

  const roles = rolesForCompetition(
    user.roles,
    await getCurrentCompetitionId()
  );
  const [defaultRole] = roles;
  if (!defaultRole) {
    return {
      error:
        "You don't have a role in the current competition. Contact an administrator.",
    };
  }

  await createSession(user.email, defaultRole);
  redirect(getHomePathForRole(defaultRole));
}

export async function switchPortalRole(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) {
    redirect("/portal/login");
  }

  const role = userRoleSchema.safeParse(formData.get("role"));
  if (!role.success || !session.roles.includes(role.data)) {
    redirect(getHomePathForRole(session.role));
  }

  await createSession(session.username, role.data, { source: session.source });
  redirect(getHomePathForRole(role.data));
}

export async function portalLogout(): Promise<void> {
  await deleteSession();
  redirect("/portal/login");
}
