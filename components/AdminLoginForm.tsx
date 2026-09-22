"use client";

import { useActionState } from "react";
import { adminLogin, type AdminLoginState } from "@/app/actions/adminAuth";
import type { UserRole } from "@/schemas/userRole";

const initialState: AdminLoginState = {};

const inputClassName =
  "h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none transition-colors focus:border-foreground dark:border-white/15";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Administrator" },
  { value: "SECRETARY", label: "Secretary" },
  { value: "THESIS_JUDGE", label: "Thesis Judge" },
  { value: "EBOOK_JUDGE", label: "E-book Judge" },
];

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="role" className="text-sm font-medium">
          Role
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue="ADMIN"
          className={inputClassName}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {state.fieldErrors?.role ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.fieldErrors.role[0]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium">
          Username or email
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
