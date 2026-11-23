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
import type { ScoringAudience } from "@/schemas/scoringAudience";
import { scoringAudienceOf } from "@/schemas/scoringAudience";
import type { SerializedUser } from "@/types/user";
import type {
  AssignmentDocumentColumn,
  AssignmentRegistrationOption,
} from "@/utils/assignmentOptions";
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
  judgesByAudience,
  categories,
  competitionId,
  registrations,
  documentColumns,
  judgingDueDate = null,
}: {
  initialAssignments: SerializedJudgeAssignment[];
  judgesByAudience: Record<ScoringAudience, SerializedUser[]>;
  categories: { id: string; name: string }[];
  competitionId: string | null;
  registrations: AssignmentRegistrationOption[];
  documentColumns: AssignmentDocumentColumn[];
  judgingDueDate?: string | null;
}) {
  const [audience, setAudience] = useState<ScoringAudience>("JUDGE");
  const [assignments, setAssignments] = useState(initialAssignments);
  const judges = judgesByAudience[audience];
  const visibleAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => scoringAudienceOf(assignment.audience) === audience
      ),
    [assignments, audience]
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] =
    useState<SerializedJudgeAssignment | null>(null);
  const [reminding, setReminding] = useState(false);

  const rows = useMemo<JudgeAssignmentRow[]>(() => {
    const byRegistration = new Map<string, SerializedJudgeAssignment[]>();
    for (const assignment of visibleAssignments) {
      const list = byRegistration.get(assignment.registration_number) ?? [];
      list.push(assignment);
      byRegistration.set(assignment.registration_number, list);
    }
    return registrations.map((registration) => ({
      registration,
      assignments: byRegistration.get(registration.registration_number) ?? [],
    }));
  }, [visibleAssignments, registrations]);

  const removeAssignment = useCallback(
    async (assignment: SerializedJudgeAssignment) => {
      const key = assignmentKey(
        assignment.registration_number,
        assignment.judge_id
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
        toast.success(
          audience === "PAPER_REVIEWER"
            ? "Paper reviewer unassigned."
            : "Judge unassigned."
        );
      } catch {
        toast.error(
          audience === "PAPER_REVIEWER"
            ? "Failed to unassign paper reviewer."
            : "Failed to unassign judge."
        );
      } finally {
        setBusyKey(null);
      }
    },
    [audience]
  );

  const handleToggleJudge = useCallback(
    async (
      row: JudgeAssignmentRow,
      judge: SerializedUser,
      assign: boolean
    ) => {
      const registrationNumber = row.registration.registration_number;

      if (!assign) {
        const existing = row.assignments.find(
          (item) => item.judge_id === judge._id
        );
        if (!existing) return;
        if (existing.submitted_at || existing.scores.length > 0) {
          setRemoveTarget(existing);
          return;
        }
        await removeAssignment(existing);
        return;
      }

      setBusyKey(assignmentKey(registrationNumber, judge._id));
      try {
        const res = await fetch("/api/judge-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            judge_id: judge._id,
            registration_number: registrationNumber,
            audience,
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
        toast.error(
          audience === "PAPER_REVIEWER"
            ? "Failed to assign paper reviewer."
            : "Failed to assign judge."
        );
      } finally {
        setBusyKey(null);
      }
    },
    [audience, removeAssignment]
  );

  const remindUnscored = useCallback(async () => {
    setReminding(true);
    try {
      const res = await fetch("/api/judge-assignments/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience }),
      });
      const data = (await res.json()) as {
        error?: unknown;
        sent?: number;
        total?: number;
        message?: string;
      };
      if (!res.ok) {
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "Could not send reminders."
        );
        return;
      }
      if (!data.sent) {
        toast.message(
          data.message ?? "Every assigned judge has already submitted their scores."
        );
        return;
      }
      const people =
        audience === "PAPER_REVIEWER" ? "paper reviewer" : "judge";
      toast.success(
        data.sent === data.total
          ? `Reminder sent to ${data.sent} ${people}${data.sent === 1 ? "" : "s"}.`
          : `Reminder sent to ${data.sent} of ${data.total} ${people}s.`
      );
    } catch {
      toast.error("Could not send reminders.");
    } finally {
      setReminding(false);
    }
  }, [audience]);

  const removeTargetJudge = removeTarget
    ? judges.find((judge) => judge._id === removeTarget.judge_id)
    : undefined;

  return (
    <>
      <JudgeAssignmentsDataTable
        key={audience}
        data={rows}
        judges={judges}
        audience={audience}
        onAudienceChange={setAudience}
        categories={categories}
        competitionId={competitionId}
        documentColumns={documentColumns}
        judgingDueDate={judgingDueDate}
        busyKey={busyKey}
        reminding={reminding}
        onRemindUnscored={() => void remindUnscored()}
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
            <AlertDialogTitle>
              {audience === "PAPER_REVIEWER"
                ? "Unassign paper reviewer?"
                : "Unassign judge?"}
            </AlertDialogTitle>
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
