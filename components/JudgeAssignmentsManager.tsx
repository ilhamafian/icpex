"use client";

import { useCallback, useMemo, useState } from "react";
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
import {
  assignmentKey,
  judgeName,
  JudgeAssignmentsDataTable,
  type JudgeAssignmentRow,
} from "@/components/judge-assignments-data-table";
import type { JudgeAssignmentType } from "@/schemas/judgeAssignmentsSchema";
import type { SerializedUser } from "@/types/user";
import type { AssignmentRegistrationOption } from "@/utils/assignmentOptions";
import type { SerializedJudgeAssignment } from "@/utils/serializeJudgeAssignment";

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string") return data.error;
    return "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

export function JudgeAssignmentsManager({
  initialAssignments,
  judges,
  competitionId,
  registrations,
}: {
  initialAssignments: SerializedJudgeAssignment[];
  judges: SerializedUser[];
  competitionId: string | null;
  registrations: AssignmentRegistrationOption[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] =
    useState<SerializedJudgeAssignment | null>(null);

  const rows = useMemo<JudgeAssignmentRow[]>(() => {
    const byRegistration = new Map<string, SerializedJudgeAssignment[]>();
    for (const assignment of assignments) {
      const list = byRegistration.get(assignment.registration_number) ?? [];
      list.push(assignment);
      byRegistration.set(assignment.registration_number, list);
    }
    return registrations.map((registration) => ({
      registration,
      assignments: byRegistration.get(registration.registration_number) ?? [],
    }));
  }, [assignments, registrations]);

  const removeAssignment = useCallback(
    async (assignment: SerializedJudgeAssignment) => {
      const key = assignmentKey(
        assignment.registration_number,
        assignment.judge_id,
        assignment.type
      );
      setBusyKey(key);
      try {
        const res = await fetch(`/api/judge-assignments/${assignment._id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          toast.error(await readError(res));
          return;
        }
        setAssignments((prev) =>
          prev.filter((item) => item._id !== assignment._id)
        );
        toast.success("Judge unassigned.");
      } catch {
        toast.error("Failed to unassign judge.");
      } finally {
        setBusyKey(null);
      }
    },
    []
  );

  const handleToggleJudge = useCallback(
    async (
      row: JudgeAssignmentRow,
      judge: SerializedUser,
      type: JudgeAssignmentType,
      assign: boolean
    ) => {
      const registrationNumber = row.registration.registration_number;

      if (!assign) {
        const existing = row.assignments.find(
          (item) => item.judge_id === judge._id && item.type === type
        );
        if (!existing) return;
        if (existing.submitted_at || existing.scores.length > 0) {
          setRemoveTarget(existing);
          return;
        }
        await removeAssignment(existing);
        return;
      }

      setBusyKey(assignmentKey(registrationNumber, judge._id, type));
      try {
        const res = await fetch("/api/judge-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            judge_id: judge._id,
            registration_number: registrationNumber,
            type,
          }),
        });
        if (!res.ok) {
          toast.error(await readError(res));
          return;
        }
        const data = (await res.json()) as {
          assignment: SerializedJudgeAssignment;
        };
        setAssignments((prev) => [data.assignment, ...prev]);
        toast.success(
          `Assigned ${judgeName(judge, judge.email)} to ${registrationNumber}.`
        );
      } catch {
        toast.error("Failed to assign judge.");
      } finally {
        setBusyKey(null);
      }
    },
    [removeAssignment]
  );

  const removeTargetJudge = removeTarget
    ? judges.find((judge) => judge._id === removeTarget.judge_id)
    : undefined;

  return (
    <>
      <JudgeAssignmentsDataTable
        data={rows}
        judges={judges}
        competitionId={competitionId}
        busyKey={busyKey}
        onToggleJudge={handleToggleJudge}
      />

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign judge?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {judgeName(removeTargetJudge, removeTarget?.judge_id ?? "")}
              </span>{" "}
              has already scored{" "}
              <span className="font-medium text-foreground">
                {removeTarget?.registration_number}
              </span>
              . Unassigning will permanently delete those scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const target = removeTarget;
                setRemoveTarget(null);
                if (target) void removeAssignment(target);
              }}
            >
              Unassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
