"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  MyAssignmentsDataTable,
  type MyAssignmentRow,
} from "@/components/my-assignments-data-table";
import type { JudgeAssignmentType } from "@/schemas/judgeAssignmentsSchema";
import type { AssignmentRegistrationOption } from "@/utils/assignmentOptions";
import type { SerializedJudgeAssignment } from "@/utils/serializeJudgeAssignment";

export async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string") return data.error;
    return "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

export function MyAssignmentsManager({
  initialAssignments,
  registrations,
  allowedTypes,
}: {
  initialAssignments: SerializedJudgeAssignment[];
  registrations: AssignmentRegistrationOption[];
  allowedTypes: JudgeAssignmentType[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo<MyAssignmentRow[]>(() => {
    const byNumber = new Map(
      registrations.map((item) => [item.registration_number, item])
    );
    return assignments
      .filter((item) => allowedTypes.includes(item.type))
      .map((assignment) => ({
        assignment,
        registration: byNumber.get(assignment.registration_number),
      }));
  }, [assignments, registrations, allowedTypes]);

  const handleRespond = useCallback(
    async (
      assignment: SerializedJudgeAssignment,
      status: "ACCEPTED" | "REJECTED"
    ) => {
      setBusyId(assignment._id);
      try {
        const res = await fetch(`/api/my-assignments/${assignment._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", status }),
        });
        if (!res.ok) {
          toast.error(await readError(res));
          return;
        }
        const data = (await res.json()) as {
          assignment: SerializedJudgeAssignment;
        };
        setAssignments((prev) =>
          prev.map((item) =>
            item._id === assignment._id ? data.assignment : item
          )
        );
        toast.success(
          status === "ACCEPTED" ? "Assignment accepted." : "Assignment rejected."
        );
      } catch {
        toast.error("Failed to update status.");
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  return (
    <MyAssignmentsDataTable
      data={rows}
      showType={allowedTypes.length > 1}
      busyId={busyId}
      onRespond={handleRespond}
    />
  );
}
