"use server";

import { redirect } from "next/navigation";

import { portalLoginSchema } from "@/schemas/auth";
import { verifyPassword } from "@/lib/password";
import {
  createSession,
  deleteSession,
  verifyEnvAdminCredentials,
} from "@/lib/session";
import { UserModel } from "@/models/User";
import { getHomePathForRole } from "@/utils/portalHome";

export type PortalLoginState = {
  error?: string;
  fieldErrors?: {
    role?: string[];
    username?: string[];
    password?: string[];
  };
};

export async function portalLogin(
  _prevState: PortalLoginState,
  formData: FormData
): Promise<PortalLoginState> {
  const validated = portalLoginSchema.safeParse({
    role: formData.get("role"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { role, username, password } = validated.data;

  if (role === "ADMIN" && verifyEnvAdminCredentials(username, password)) {
    await createSession(username, "ADMIN");
    redirect(getHomePathForRole("ADMIN"));
  }

  const user = await new UserModel().findByEmail(username.toLowerCase());
  if (
    !user ||
    user.status !== "ACTIVE" ||
    !user.password_hash ||
    !user.roles.includes(role)
  ) {
    return { error: "Invalid credentials or role." };
  }

  const passwordOk = await verifyPassword(password, user.password_hash);
  if (!passwordOk) {
    return { error: "Invalid credentials or role." };
  }

  await createSession(user.email, role);
  redirect(getHomePathForRole(role));
}

export async function portalLogout(): Promise<void> {
  await deleteSession();
  redirect("/portal/login");
}
