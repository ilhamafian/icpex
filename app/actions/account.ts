"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/password";
import { getSession } from "@/lib/session";
import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import {
  changeUsernameSchema,
  resetPasswordSchema,
} from "@/schemas/auth";
import type { User } from "@/schemas/userSchema";

export type AccountFormState = {
  error?: string;
  fieldErrors?: {
    current_password?: string[];
    username?: string[];
    password?: string[];
    confirm_password?: string[];
  };
  success?: string;
};

const initialFailure = {
  error: "Something went wrong. Try again.",
} satisfies AccountFormState;

type MutableAccount = {
  user: User;
  model: UserModel;
};

async function loadMutableAccount(): Promise<
  MutableAccount | { error: string }
> {
  const session = await getSession();
  if (!session) redirect("/portal/login");
  if (session.source === "env") {
    return {
      error:
        "This account is configured on the server and can't be changed here.",
    };
  }

  const model = new UserModel();
  const user = await model.findByEmail(session.username.toLowerCase());
  if (!user?.password_hash || !user._id) {
    return { error: "Account not found." };
  }

  return { user, model };
}

async function passwordMatches(password: string, hash: string) {
  return verifyPassword(password, hash);
}

export async function changeUsername(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const parsed = changeUsernameSchema.safeParse({
    current_password: formData.get("current_password"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const account = await loadMutableAccount();
  if ("error" in account) return { error: account.error };

  const nextUsername = parsed.data.username;
  if (nextUsername === account.user.name?.trim()) {
    return { success: "That is already your username." };
  }

  const passwordOk = await passwordMatches(
    parsed.data.current_password,
    account.user.password_hash!
  );
  if (!passwordOk) {
    return {
      fieldErrors: { current_password: ["Current password is incorrect."] },
    };
  }

  const result = await account.model.updateCredentials(
    toIdString(account.user._id),
    { name: nextUsername }
  );
  if (result.matchedCount === 0) return initialFailure;

  revalidatePath("/portal", "layout");
  return { success: "Username updated." };
}

export async function resetPassword(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const parsed = resetPasswordSchema.safeParse({
    current_password: formData.get("current_password"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      error: flat.formErrors[0],
      fieldErrors: flat.fieldErrors,
    };
  }

  const account = await loadMutableAccount();
  if ("error" in account) return { error: account.error };

  const passwordOk = await passwordMatches(
    parsed.data.current_password,
    account.user.password_hash!
  );
  if (!passwordOk) {
    return {
      fieldErrors: { current_password: ["Current password is incorrect."] },
    };
  }

  const password_hash = await hashPassword(parsed.data.password);
  const result = await account.model.updateCredentials(
    toIdString(account.user._id),
    { password_hash }
  );
  if (result.matchedCount === 0) return initialFailure;

  revalidatePath("/portal/account");
  return { success: "Password updated." };
}
