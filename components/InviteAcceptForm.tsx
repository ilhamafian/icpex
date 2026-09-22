"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/schemas/userRole";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  SECRETARY: "Secretary",
  THESIS_JUDGE: "Thesis Judge",
  EBOOK_JUDGE: "E-book Judge",
};

type InviteAcceptFormProps = {
  token: string;
  email: string;
  roles: UserRole[];
};

export function InviteAcceptForm({
  token,
  email,
  roles,
}: InviteAcceptFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          name: name.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Could not activate your account."
        );
        return;
      }

      router.push("/admin/login");
    } catch {
      setError("Could not activate your account.");
    } finally {
      setPending(false);
    }
  }

  const roleLabel = roles.map((r) => ROLE_LABELS[r] ?? r).join(", ");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15">
        <p>
          <span className="text-muted-foreground">Email</span>
          <br />
          <span className="font-medium">{email}</span>
        </p>
        <p className="mt-2">
          <span className="text-muted-foreground">Role</span>
          <br />
          <span className="font-medium">{roleLabel}</span>
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-name">Name (optional)</Label>
        <Input
          id="invite-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-password">Password</Label>
        <Input
          id="invite-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-confirm">Confirm password</Label>
        <Input
          id="invite-confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-2 h-11 w-full">
        {pending ? "Creating account…" : "Verify email & create password"}
      </Button>
    </form>
  );
}
