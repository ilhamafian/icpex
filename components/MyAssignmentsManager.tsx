"use client";

import { useMemo } from "react";

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
  judgingDueDate = null,
}: {
  initialAssignments: SerializedJudgeAssignment[];
  registrations: AssignmentRegistrationOption[];
  allowedTypes: JudgeAssignmentType[];
  judgingDueDate?: string | null;
}) {
  const rows = useMemo<MyAssignmentRow[]>(() => {
    const byNumber = new Map(
      registrations.map((item) => [item.registration_number, item])
    );
    return initialAssignments
      .filter((item) => allowedTypes.includes(item.type))
      .map((assignment) => ({
        assignment,
        registration: byNumber.get(assignment.registration_number),
      }));
  }, [initialAssignments, registrations, allowedTypes]);

  return (
    <MyAssignmentsDataTable
      data={rows}
      showType={allowedTypes.length > 1}
      judgingDueDate={judgingDueDate}
    />
  );
}
