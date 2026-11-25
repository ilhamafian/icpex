"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  changeParticipantPassword,
  participantLogin,
  participantSignup,
  requestParticipantPasswordReset,
  resendParticipantVerification,
  resetParticipantPassword,
  type ParticipantLoginState,
  type ParticipantMessageState,
  type ParticipantSignupState,
} from "@/app/actions/participantAuth";
import { inputClassName, paperInputClassName } from "@/components/marketing/registrationFormUi";

const buttonClassName =
  "mt-2 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#d6a11e] px-8 text-sm font-bold tracking-wide text-[#1a1408] transition-colors hover:bg-[#e2b43a] disabled:cursor-not-allowed disabled:opacity-60";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-red-300">{messages[0]}</p>;
}

export function ParticipantLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(participantLogin, {} as ParticipantLoginState);
  const [resendState, resendAction, resendPending] = useActionState(
    resendParticipantVerification,
    {} as ParticipantMessageState
  );

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClassName}
          />
          <FieldError messages={state.fieldErrors?.email} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Link href="/forgot-password" className="text-sm font-semibold text-[#e8b84a] underline-offset-2 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClassName}
          />
          <FieldError messages={state.fieldErrors?.password} />
        </div>
        {state.error ? (
          <p className="text-sm text-red-300" role="alert">
            {state.error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={buttonClassName}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {state.unverifiedEmail ? (
        <form action={resendAction} className="flex flex-col gap-2">
          <input type="hidden" name="email" value={state.unverifiedEmail} />
          <button
            type="submit"
            disabled={resendPending}
            className="text-sm font-semibold text-[#e8b84a] underline-offset-2 hover:underline disabled:opacity-60"
          >
            {resendPending ? "Sending…" : "Resend verification email"}
          </button>
          {resendState.success ? (
            <p className="text-sm text-white/75">{resendState.success}</p>
          ) : null}
          {resendState.error ? (
            <p className="text-sm text-red-300">{resendState.error}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

export function ParticipantSignupForm() {
  const [state, action, pending] = useActionState(participantSignup, {} as ParticipantSignupState);

  if (state.success) {
    return <p className="text-sm text-white/80">{state.success}</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Full name
        </label>
        <input id="name" name="name" type="text" autoComplete="name" required className={inputClassName} />
        <FieldError messages={state.fieldErrors?.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClassName} />
        <FieldError messages={state.fieldErrors?.email} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClassName}
        />
        <FieldError messages={state.fieldErrors?.password} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm_password" className="text-sm font-medium">
          Confirm password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClassName}
        />
        <FieldError messages={state.fieldErrors?.confirm_password} />
      </div>
      {state.error ? (
        <p className="text-sm text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={buttonClassName}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export function ParticipantForgotForm() {
  const [state, action, pending] = useActionState(
    requestParticipantPasswordReset,
    {} as ParticipantMessageState
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClassName} />
        <FieldError messages={state.fieldErrors?.email} />
      </div>
      {state.success ? <p className="text-sm text-white/80">{state.success}</p> : null}
      {state.error ? (
        <p className="text-sm text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={buttonClassName}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ParticipantResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    resetParticipantPassword,
    {} as ParticipantMessageState
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClassName}
        />
        <FieldError messages={state.fieldErrors?.password} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm_password" className="text-sm font-medium">
          Confirm password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClassName}
        />
        <FieldError messages={state.fieldErrors?.confirm_password} />
      </div>
      {state.error ? (
        <p className="text-sm text-red-300" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={buttonClassName}>
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

export function ParticipantPasswordForm() {
  const [state, action, pending] = useActionState(
    changeParticipantPassword,
    {} as ParticipantMessageState
  );

  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="current_password" className="text-sm font-medium">
          Current password
        </label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          className={paperInputClassName}
        />
        <FieldError messages={state.fieldErrors?.current_password} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={paperInputClassName}
        />
        <FieldError messages={state.fieldErrors?.password} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm_password" className="text-sm font-medium">
          Confirm password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          className={paperInputClassName}
        />
        <FieldError messages={state.fieldErrors?.confirm_password} />
      </div>
      {state.success ? <p className="text-sm text-[#8a6410]">{state.success}</p> : null}
      {state.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={buttonClassName}>
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
