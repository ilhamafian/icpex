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
import type { CompetitionStatus } from "@/schemas/competitionSchema";
import type { UserRole } from "@/schemas/userSchema";
import type { SerializedUser } from "@/types/user";
import { hasGrant } from "@/utils/roleGrants";

const ROLE_OPTIONS: UserRole[] = [
  "ADMIN",
  "SECRETARY",
  "JUDGE_LEADER",
  "THESIS_JUDGE",
  "EBOOK_JUDGE",
  "JTEC_JUDGE",
];

export type UserCompetitionOption = {
  id: string;
  name: string;
  status: CompetitionStatus;
};

type InviteFormState = {
  email: string;
  role: UserRole;
  competitionId: string;
};

function emptyInviteForm(competitionId: string): InviteFormState {
  return { email: "", role: "SECRETARY", competitionId };
}

function availableRoles(user: SerializedUser, competitionId: string): UserRole[] {
  return ROLE_OPTIONS.filter(
    (role) => !hasGrant(user.roles, role, competitionId)
  );
}

function grantKey(role: UserRole, competitionId?: string) {
  return `${role}:${competitionId ?? ""}`;
}

function competitionLabel(
  competition: UserCompetitionOption,
  currentCompetitionId: string | null
) {
  if (competition.id === currentCompetitionId) {
    return `${competition.name} (current)`;
  }
  return `${competition.name} · ${competition.status.toLowerCase()}`;
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
  competitions,
  currentCompetitionId,
}: {
  initialUsers: SerializedUser[];
  competitions: UserCompetitionOption[];
  currentCompetitionId: string | null;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [competitionId, setCompetitionId] = useState(
    currentCompetitionId ?? competitions[0]?.id ?? ""
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<InviteFormState>(() =>
    emptyInviteForm(competitionId)
  );
  const needsCompetition = form.role !== "ADMIN";
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SerializedUser | null>(
    null
  );
  const [roleTarget, setRoleTarget] = useState<SerializedUser | null>(null);
  const [roleForm, setRoleForm] = useState<Omit<InviteFormState, "email">>({
    role: "SECRETARY",
    competitionId,
  });
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [removingRoleKey, setRemovingRoleKey] = useState<string | null>(null);
  const roleNeedsCompetition = roleForm.role !== "ADMIN";
  const rolesAvailable = roleTarget
    ? availableRoles(roleTarget, roleForm.competitionId)
    : ROLE_OPTIONS;

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
          ...(needsCompetition ? { competition_id: form.competitionId } : {}),
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
      setForm(emptyInviteForm(competitionId));
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

  function openAddRole(user: SerializedUser) {
    const nextCompetitionId = competitionId;
    const openRoles = availableRoles(user, nextCompetitionId);
    setRoleForm({
      role: openRoles[0] ?? "SECRETARY",
      competitionId: nextCompetitionId,
    });
    setRoleTarget(user);
  }

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleTarget) return;
    setRoleSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: roleTarget.email,
          role: roleForm.role,
          ...(roleNeedsCompetition
            ? { competition_id: roleForm.competitionId }
            : {}),
        }),
      });

      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }

      const data = (await res.json()) as { user: SerializedUser };
      const openRoles = availableRoles(data.user, roleForm.competitionId);
      setUsers((prev) =>
        prev.map((user) => (user._id === data.user._id ? data.user : user))
      );
      setRoleTarget(data.user);
      setRoleForm((prev) => ({
        ...prev,
        role: openRoles.includes(prev.role)
          ? prev.role
          : (openRoles[0] ?? prev.role),
      }));
      toast.success(
        roleTarget.status === "INVITED"
          ? `Added ${ROLE_LABELS[roleForm.role]} and resent the invite to ${roleTarget.email}`
          : `Added ${ROLE_LABELS[roleForm.role]} to ${roleTarget.email}`
      );
    } catch {
      toast.error("Failed to add role.");
    } finally {
      setRoleSubmitting(false);
    }
  }

  async function handleRemoveRole(role: UserRole, grantCompetitionId?: string) {
    if (!roleTarget) return;
    const key = grantKey(role, grantCompetitionId);
    setRemovingRoleKey(key);
    try {
      const res = await fetch(`/api/users/${roleTarget._id}/roles`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          ...(grantCompetitionId ? { competition_id: grantCompetitionId } : {}),
        }),
      });

      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }

      const data = (await res.json()) as { user: SerializedUser };
      const openRoles = availableRoles(
        data.user,
        roleForm.competitionId
      );
      setUsers((prev) =>
        prev.map((user) => (user._id === data.user._id ? data.user : user))
      );
      setRoleTarget(data.user);
      setRoleForm((prev) => ({
        ...prev,
        role: openRoles.includes(prev.role)
          ? prev.role
          : (openRoles[0] ?? prev.role),
      }));
      const competition = competitions.find(
        (item) => item.id === grantCompetitionId
      );
      const label = competition
        ? `${ROLE_LABELS[role]} for ${competition.name}`
        : ROLE_LABELS[role];
      toast.success(`Removed ${label} from ${roleTarget.email}`);
    } catch {
      toast.error("Failed to remove role.");
    } finally {
      setRemovingRoleKey(null);
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
        competitionId={competitionId || null}
        toolbar={
          competitions.length > 0 ? (
            <Select value={competitionId} onValueChange={setCompetitionId}>
              <SelectTrigger
                size="sm"
                className="w-56"
                aria-label="Show roles for competition"
              >
                <SelectValue placeholder="Select competition" />
              </SelectTrigger>
              <SelectContent>
                {competitions.map((competition) => (
                  <SelectItem key={competition.id} value={competition.id}>
                    {competitionLabel(competition, currentCompetitionId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
        busyId={busyId}
        onAddUser={() => {
          setForm(emptyInviteForm(competitionId));
          setSheetOpen(true);
        }}
        onAddRole={openAddRole}
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
            {needsCompetition ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-competition">Competition</Label>
                <Select
                  value={form.competitionId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, competitionId: value }))
                  }
                  disabled={competitions.length === 0}
                >
                  <SelectTrigger id="invite-competition" className="w-full">
                    <SelectValue
                      placeholder={
                        competitions.length === 0
                          ? "Create a competition first"
                          : "Select a competition"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {competitions.map((competition) => (
                      <SelectItem key={competition.id} value={competition.id}>
                        {competitionLabel(competition, currentCompetitionId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <p className="text-muted-foreground text-sm">
              {needsCompetition
                ? "Secretary and judge roles apply to one competition only. When a newer competition is published, staff need to be assigned again."
                : "Administrators have access to every competition."}{" "}
              New users get an invite email; existing users just gain the role.
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
              disabled={
                submitting ||
                !form.email.trim() ||
                (needsCompetition && !form.competitionId)
              }
            >
              {submitting ? "Sending…" : "Send invite"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={roleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRoleTarget(null);
        }}
      >
        <SheetContent className="flex flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Roles</SheetTitle>
          </SheetHeader>
          <form
            id="add-role-form"
            onSubmit={handleAddRole}
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
          >
            <p className="text-sm">
              <span className="font-medium">{roleTarget?.email}</span>
              {roleTarget?.name ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {roleTarget.name}
                </span>
              ) : null}
            </p>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Current roles</p>
              <ul className="flex flex-col gap-2">
                {roleTarget?.roles.map((grant) => {
                  const key = grantKey(grant.role, grant.competition_id);
                  const competition = competitions.find(
                    (item) => item.id === grant.competition_id
                  );
                  const onlyRole = roleTarget.roles.length <= 1;
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                    >
                      <span className="text-sm">
                        {ROLE_LABELS[grant.role]}
                        {grant.competition_id ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {competition?.name ?? "Unknown competition"}
                          </span>
                        ) : null}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={onlyRole || removingRoleKey !== null || roleSubmitting}
                        onClick={() =>
                          void handleRemoveRole(grant.role, grant.competition_id)
                        }
                      >
                        {removingRoleKey === key ? "Removing…" : "Remove"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
              {roleTarget && roleTarget.roles.length <= 1 ? (
                <p className="text-muted-foreground text-sm">
                  A user must keep at least one role. Delete the user to remove
                  the last one.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-role">Add a role</Label>
              <Select
                value={roleForm.role}
                onValueChange={(value) =>
                  setRoleForm((prev) => ({
                    ...prev,
                    role: value as UserRole,
                  }))
                }
              >
                <SelectTrigger id="add-role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem
                      key={role}
                      value={role}
                      disabled={
                        roleTarget
                          ? hasGrant(roleTarget.roles, role, roleForm.competitionId)
                          : false
                      }
                    >
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {roleNeedsCompetition ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="add-role-competition">Competition</Label>
                <Select
                  value={roleForm.competitionId}
                  onValueChange={(value) => {
                    if (!roleTarget) return;
                    const openRoles = availableRoles(roleTarget, value);
                    setRoleForm((prev) => ({
                      role: openRoles.includes(prev.role)
                        ? prev.role
                        : (openRoles[0] ?? prev.role),
                      competitionId: value,
                    }));
                  }}
                  disabled={competitions.length === 0}
                >
                  <SelectTrigger id="add-role-competition" className="w-full">
                    <SelectValue placeholder="Select a competition" />
                  </SelectTrigger>
                  <SelectContent>
                    {competitions.map((competition) => (
                      <SelectItem key={competition.id} value={competition.id}>
                        {competitionLabel(competition, currentCompetitionId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <p className="text-muted-foreground text-sm">
              {rolesAvailable.length === 0
                ? "This user already has every role for the selected competition."
                : roleTarget?.status === "INVITED"
                  ? "Adding a role resends their invite email."
                  : "The role is available the next time they sign in."}
            </p>
          </form>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoleTarget(null)}
              disabled={roleSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-role-form"
              disabled={
                roleSubmitting ||
                !rolesAvailable.includes(roleForm.role) ||
                (roleNeedsCompetition && !roleForm.competitionId)
              }
            >
              {roleSubmitting ? "Adding…" : "Add role"}
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
