"use server";

import { redirect } from "next/navigation";

import { adminLoginSchema } from "@/schemas/auth";
import { verifyPassword } from "@/lib/password";
import {
  createSession,
  deleteSession,
  verifyEnvAdminCredentials,
} from "@/lib/session";
import { UserModel } from "@/models/User";

export type AdminLoginState = {
  error?: string;
  fieldErrors?: {
    role?: string[];
    username?: string[];
    password?: string[];
  };
};

export async function adminLogin(
  _prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const validated = adminLoginSchema.safeParse({
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
    redirect("/admin/dashboard");
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
  redirect("/admin/dashboard");
}

export async function adminLogout(): Promise<void> {
  await deleteSession();
  redirect("/admin/login");
}
