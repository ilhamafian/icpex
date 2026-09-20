"use server";

import { redirect } from "next/navigation";
import { adminLoginSchema } from "@/schemas/auth";
import {
  createAdminSession,
  deleteSession,
  verifyEnvAdminCredentials,
} from "@/lib/session";

export type AdminLoginState = {
  error?: string;
  fieldErrors?: {
    username?: string[];
    password?: string[];
  };
};

export async function adminLogin(
  _prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const validated = adminLoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { username, password } = validated.data;

  if (!verifyEnvAdminCredentials(username, password)) {
    return { error: "Invalid username or password." };
  }

  await createAdminSession(username);
  redirect("/admin/dashboard");
}

export async function adminLogout(): Promise<void> {
  await deleteSession();
  redirect("/admin/login");
}
