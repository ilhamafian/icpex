import { MyAssignmentsManager } from "@/components/MyAssignmentsManager";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { toIdString } from "@/schemas/objectId";
import { toAssignmentRegistrationOption } from "@/utils/assignmentOptions";
import { findRegistrationsForCompetition } from "@/utils/competitionScope";
import { judgeTypesForRoles } from "@/utils/judgeTypes";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { resolveJudgeUser } from "@/utils/resolveJudgeUser";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { redirect } from "next/navigation";

async function loadMyAssignments(
  judgeId: string,
  competitionId: string | null
) {
  try {
    const registrations = await findRegistrationsForCompetition(competitionId);
    const assignments =
      registrations.length === 0
        ? []
        : await new JudgeAssignmentModel().find(
            {
              judge_id: judgeId,
              registration_number: {
                $in: registrations.map((item) => item.registration_number),
              },
            },
            { sort: { created_at: -1 } }
          );

    const assignedNumbers = new Set(
      assignments.map((item) => item.registration_number)
    );

    return {
      assignments: assignments.map(serializeJudgeAssignment),
      registrations: registrations
        .filter((item) => assignedNumbers.has(item.registration_number))
        .map(toAssignmentRegistrationOption),
    };
  } catch {
    return { assignments: [], registrations: [] };
  }
}

export default async function MyAssignmentsPage() {
  const session = await requirePortalSection("my-assignments");
  const judge = await resolveJudgeUser(session);
  if (!judge) {
    redirect("/portal/login");
  }

  const allowedTypes = judgeTypesForRoles(judge.roles);
  if (allowedTypes.length === 0) {
    redirect("/portal/login");
  }

  const { assignments, registrations } = await loadMyAssignments(
    toIdString(judge._id),
    session.competition_id
  );

  return (
    <MyAssignmentsManager
      initialAssignments={assignments}
      registrations={registrations}
      allowedTypes={allowedTypes}
    />
  );
}
