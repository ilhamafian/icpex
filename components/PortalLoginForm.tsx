"use client";

import { useActionState } from "react";
import { portalLogin, type PortalLoginState } from "@/app/actions/portalAuth";
import { inputClassName } from "@/components/marketing/registrationFormUi";

const initialState: PortalLoginState = {};

export function PortalLoginForm() {
  const [state, action, pending] = useActionState(portalLogin, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
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
          <p className="text-sm text-red-300">
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
          <p className="text-sm text-red-300">
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p className="text-sm text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#d6a11e] px-8 text-sm font-bold tracking-wide text-[#1a1408] transition-colors hover:bg-[#e2b43a] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
