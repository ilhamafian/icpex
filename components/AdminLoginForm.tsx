"use client";

import { useActionState } from "react";
import { adminLogin, type AdminLoginState } from "@/app/actions/adminAuth";

const initialState: AdminLoginState = {};

const inputClassName =
  "h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none transition-colors focus:border-foreground dark:border-white/15";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className={inputClassName}
        />
        {state.fieldErrors?.username ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.fieldErrors.username[0]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClassName}
        />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-11 w-full rounded-lg bg-foreground text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
