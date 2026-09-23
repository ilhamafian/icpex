"use client";

import { useMemo, useState } from "react";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  JudgeAssignmentStatus,
  JudgeAssignmentType,
} from "@/schemas/judgeAssignmentsSchema";
import type { SerializedUser } from "@/types/user";
import type { AssignmentRegistrationOption } from "@/utils/assignmentOptions";
import type { SerializedJudgeAssignment } from "@/utils/serializeJudgeAssignment";

type FormState = {
  judge_id: string;
  registration_number: string;
  type: JudgeAssignmentType;
  status: JudgeAssignmentStatus;
};

function emptyForm(type: JudgeAssignmentType = "THESIS"): FormState {
  return {
    judge_id: "",
    registration_number: "",
    type,
    status: "PENDING",
  };
}

function assignmentToForm(
  assignment: SerializedJudgeAssignment
): FormState {
  return {
    judge_id: assignment.judge_id,
    registration_number: assignment.registration_number,
    type: assignment.type,
    status: assignment.status,
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
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

function judgeLabel(judge: SerializedUser | undefined, fallbackId: string) {
  if (!judge) return fallbackId;
  return judge.name ? `${judge.name} (${judge.email})` : judge.email;
}

function statusVariant(
  status: JudgeAssignmentStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ACCEPTED":
      return "default";
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

const TYPE_ROLE: Record<JudgeAssignmentType, "THESIS_JUDGE" | "EBOOK_JUDGE"> = {
  THESIS: "THESIS_JUDGE",
  EBOOK: "EBOOK_JUDGE",
};

export function JudgeAssignmentsManager({
  initialAssignments,
  judges,
  registrations,
}: {
  initialAssignments: SerializedJudgeAssignment[];
  judges: SerializedUser[];
  registrations: AssignmentRegistrationOption[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [tab, setTab] = useState<JudgeAssignmentType>("THESIS");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] =
    useState<SerializedJudgeAssignment | null>(null);

  const judgesById = useMemo(() => {
    const map = new Map<string, SerializedUser>();
    for (const judge of judges) map.set(judge._id, judge);
    return map;
  }, [judges]);

  const registrationsByNumber = useMemo(() => {
    const map = new Map<string, AssignmentRegistrationOption>();
    for (const registration of registrations) {
      map.set(registration.registration_number, registration);
    }
    return map;
  }, [registrations]);

  const eligibleJudges = useMemo(() => {
    const role = TYPE_ROLE[form.type];
    return judges.filter(
      (judge) =>
        judge.roles.includes(role) && judge.status !== "DISABLED"
    );
  }, [judges, form.type]);

  const byType = useMemo(() => {
    return {
      THESIS: assignments.filter((item) => item.type === "THESIS"),
      EBOOK: assignments.filter((item) => item.type === "EBOOK"),
    };
  }, [assignments]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(tab));
    setSheetOpen(true);
  }

  function openEdit(assignment: SerializedJudgeAssignment) {
    setEditingId(assignment._id);
    setForm(assignmentToForm(assignment));
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.judge_id) {
      toast.error("Select a judge.");
      return;
    }
    if (!form.registration_number) {
      toast.error("Select a registration.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editingId
          ? `/api/judge-assignments/${editingId}`
          : "/api/judge-assignments",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            judge_id: form.judge_id,
            registration_number: form.registration_number,
            type: form.type,
            status: form.status,
          }),
        }
      );

      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }

      const data = (await res.json()) as {
        assignment: SerializedJudgeAssignment;
      };
      setAssignments((prev) => {
        if (editingId) {
          return prev.map((item) =>
            item._id === editingId ? data.assignment : item
          );
        }
        return [data.assignment, ...prev];
      });
      setSheetOpen(false);
      toast.success(
        editingId ? "Assignment updated." : "Judge assigned."
      );
    } catch {
      toast.error("Failed to save assignment.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/judge-assignments/${target._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(await readError(res));
        return;
      }
      setAssignments((prev) => prev.filter((item) => item._id !== target._id));
      toast.success("Assignment removed.");
    } catch {
      toast.error("Failed to delete assignment.");
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Judge Assignments</h2>
          <p className="text-sm text-muted-foreground">
            Assign thesis and e-book judges to registered submissions.
          </p>
        </div>
        <Button size="icon" onClick={openCreate} aria-label="Add assignment">
          <IconPlus />
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as JudgeAssignmentType)}
        className="gap-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="THESIS">Thesis</TabsTrigger>
          <TabsTrigger value="EBOOK">E-Book</TabsTrigger>
        </TabsList>

        {(
          [
            ["THESIS", "Thesis"],
            ["EBOOK", "E-Book"],
          ] as const
        ).map(([type, label]) => {
          const items = byType[type];
          return (
            <TabsContent key={type} value={type} className="mt-0">
              <div className="mb-3 text-sm text-muted-foreground">
                {items.length}{" "}
                {items.length === 1 ? "assignment" : "assignments"}
              </div>

              {items.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No {label.toLowerCase()} assignments yet. Tap + to assign a
                    judge.
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {items.map((item) => {
                    const judge = judgesById.get(item.judge_id);
                    const registration = registrationsByNumber.get(
                      item.registration_number
                    );
                    return (
                      <Card key={item._id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <CardTitle className="text-base">
                                {item.registration_number}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {registration?.project_title ??
                                  "Unknown project"}
                                {registration
                                  ? ` · ${registration.participant_name}`
                                  : ""}
                              </CardDescription>
                              <p className="mt-2 text-sm">
                                Judge:{" "}
                                {judgeLabel(judge, item.judge_id)}
                              </p>
                              {item.submitted_at ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Score {item.total_score} · submitted{" "}
                                  {new Date(
                                    item.submitted_at
                                  ).toLocaleDateString()}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Badge variant={statusVariant(item.status)}>
                                {item.status}
                              </Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEdit(item)}
                                aria-label={`Edit assignment ${item.registration_number}`}
                              >
                                <IconPencil />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteTarget(item)}
                                aria-label={`Delete assignment ${item.registration_number}`}
                              >
                                <IconTrash />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col gap-4 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingId ? "Edit assignment" : "Assign judge"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 px-4">
            <Field label="Type">
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    type: value as JudgeAssignmentType,
                    judge_id: "",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THESIS">Thesis</SelectItem>
                  <SelectItem value="EBOOK">E-Book</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Registration">
              <Select
                value={form.registration_number || undefined}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    registration_number: value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select registration" />
                </SelectTrigger>
                <SelectContent>
                  {registrations.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No registrations available
                    </SelectItem>
                  ) : (
                    registrations.map((registration) => (
                      <SelectItem
                        key={registration.registration_number}
                        value={registration.registration_number}
                      >
                        {registration.registration_number} —{" "}
                        {registration.project_title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Judge">
              <Select
                value={form.judge_id || undefined}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, judge_id: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select judge" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleJudges.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No eligible judges for this type
                    </SelectItem>
                  ) : (
                    eligibleJudges.map((judge) => (
                      <SelectItem key={judge._id} value={judge._id}>
                        {judgeLabel(judge, judge._id)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as JudgeAssignmentStatus,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="ACCEPTED">ACCEPTED</SelectItem>
                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Assign"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unassign the judge from{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.registration_number}
              </span>
              . Any scored work on this assignment will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
