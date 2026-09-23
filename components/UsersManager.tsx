"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ROLE_LABELS,
  UsersDataTable,
} from "@/components/users-data-table";
import type { UserRole } from "@/schemas/userSchema";
import type { SerializedUser } from "@/types/user";

const ROLE_OPTIONS: UserRole[] = [
  "ADMIN",
  "SECRETARY",
  "THESIS_JUDGE",
  "EBOOK_JUDGE",
];

type InviteFormState = {
  email: string;
  role: UserRole;
};

function emptyInviteForm(): InviteFormState {
  return { email: "", role: "SECRETARY" };
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string") return data.error;
    return "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

export function UsersManager({
  initialUsers,
}: {
  initialUsers: SerializedUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<InviteFormState>(emptyInviteForm);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SerializedUser | null>(
    null
  );

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          role: form.role,
        }),
      });

      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }

      const data = (await res.json()) as {
        user: SerializedUser;
        roleAdded?: boolean;
      };
      setUsers((prev) => {
        if (data.roleAdded) {
          return prev.map((u) => (u._id === data.user._id ? data.user : u));
        }
        return [data.user, ...prev];
      });
      setSheetOpen(false);
      setForm(emptyInviteForm());
      toast.success(
        data.roleAdded
          ? `Added role to ${data.user.email}`
          : `Invite sent to ${data.user.email}`
      );
    } catch {
      toast.error("Failed to send invite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendInvite(user: SerializedUser) {
    setBusyId(user._id);
    try {
      const res = await fetch(`/api/users/${user._id}/resend-invite`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      const data = (await res.json()) as { user: SerializedUser };
      setUsers((prev) =>
        prev.map((u) => (u._id === data.user._id ? data.user : u))
      );
      toast.success(`Invite resent to ${user.email}`);
    } catch {
      toast.error("Failed to resend invite.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setBusyId(target._id);
    try {
      const res = await fetch(`/api/users/${target._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      setUsers((prev) => prev.filter((u) => u._id !== target._id));
      toast.success(`Removed ${target.email}`);
    } catch {
      toast.error("Failed to delete user.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <UsersDataTable
        data={users}
        busyId={busyId}
        onAddUser={() => {
          setForm(emptyInviteForm());
          setSheetOpen(true);
        }}
        onResendInvite={handleResendInvite}
        onDeleteUser={setDeleteTarget}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add user</SheetTitle>
          </SheetHeader>
          <form
            id="invite-user-form"
            onSubmit={handleInvite}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="name@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    role: value as UserRole,
                  }))
                }
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground text-sm">
              New users get an invite email. An existing email can receive
              additional roles; the same email and role cannot be duplicated.
            </p>
          </form>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="invite-user-form"
              disabled={submitting || !form.email.trim()}
            >
              {submitting ? "Sending…" : "Send invite"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.email}
              </span>{" "}
              and any pending invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
