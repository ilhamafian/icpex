"use client";

import { useActionState, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  changeUsername,
  resetPassword,
  type AccountFormState,
} from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AccountFormState = {};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}

function UsernameForm({
  username,
  email,
}: {
  username: string;
  email: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (prev: AccountFormState, formData: FormData) => {
      const result = await changeUsername(prev, formData);
      if (result.success) router.refresh();
      return result;
    },
    initialState
  );

  return (
    <Card>
      <form key={username} action={action} className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>Username</CardTitle>
          <CardDescription>Shown on your profile.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} readOnly disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="nickname"
              required
              defaultValue={username}
              maxLength={80}
              aria-invalid={Boolean(state.fieldErrors?.username)}
            />
            <FieldError messages={state.fieldErrors?.username} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="username-current-password">Current password</Label>
            <Input
              id="username-current-password"
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(state.fieldErrors?.current_password)}
            />
            <FieldError messages={state.fieldErrors?.current_password} />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-muted-foreground" role="status">
              {state.success}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="border-t">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save username"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (prev: AccountFormState, formData: FormData) => {
      const result = await resetPassword(prev, formData);
      if (result.success) formRef.current?.reset();
      return result;
    },
    initialState
  );

  return (
    <Card>
      <form
        ref={formRef}
        action={action}
        className="flex flex-col gap-6"
      >
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Choose a new password of at least 8 characters.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password-current">Current password</Label>
            <Input
              id="password-current"
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(state.fieldErrors?.current_password)}
            />
            <FieldError messages={state.fieldErrors?.current_password} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={Boolean(state.fieldErrors?.password)}
            />
            <FieldError messages={state.fieldErrors?.password} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={Boolean(state.fieldErrors?.confirm_password)}
            />
            <FieldError messages={state.fieldErrors?.confirm_password} />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-muted-foreground" role="status">
              {state.success}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="border-t">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Reset password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function AccountSettings({
  username,
  email,
  canEdit,
}: {
  username: string;
  email: string;
  canEdit: boolean;
}) {
  if (!canEdit) {
    return (
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            This sign-in is configured on the server, so the username and
            password can&apos;t be changed here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <UsernameForm username={username} email={email} />
      <PasswordForm />
    </div>
  );
}
