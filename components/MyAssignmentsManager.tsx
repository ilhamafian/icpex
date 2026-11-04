"use client";

import { useMemo } from "react";

import {
  MyAssignmentsDataTable,
  type MyAssignmentRow,
} from "@/components/my-assignments-data-table";
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
  judgingDueDate = null,
}: {
  initialAssignments: SerializedJudgeAssignment[];
  registrations: AssignmentRegistrationOption[];
  judgingDueDate?: string | null;
}) {
  const rows = useMemo<MyAssignmentRow[]>(() => {
    const byNumber = new Map(
      registrations.map((item) => [item.registration_number, item])
    );
    return initialAssignments.map((assignment) => ({
      assignment,
      registration: byNumber.get(assignment.registration_number),
    }));
  }, [initialAssignments, registrations]);

  return (
    <MyAssignmentsDataTable data={rows} judgingDueDate={judgingDueDate} />
  );
}
