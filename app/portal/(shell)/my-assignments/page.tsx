import { MyAssignmentsManager } from "@/components/MyAssignmentsManager";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { toIdString } from "@/schemas/objectId";
import { toAssignmentRegistrationOption } from "@/utils/assignmentOptions";
import { findRegistrationsForCompetition } from "@/utils/competitionScope";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { canScoreAssignments } from "@/utils/judgeTypes";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { resolveJudgeUser } from "@/utils/resolveJudgeUser";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { filterByEducationLevel } from "@/utils/trackAccess";
import { redirect } from "next/navigation";

async function loadMyAssignments(
  judgeId: string,
  competitionId: string | null,
  role: Parameters<typeof filterByEducationLevel>[0]
) {
  try {
    const assignmentModel = new JudgeAssignmentModel();
    await assignmentModel.acceptPending();
    await assignmentModel.collapseDuplicates();

    const registrations = filterByEducationLevel(
      role,
      await findRegistrationsForCompetition(competitionId)
    );
    const assignments =
      registrations.length === 0
        ? []
        : await assignmentModel.find(
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
        .map((registration) => toAssignmentRegistrationOption(registration)),
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

  if (!canScoreAssignments(judge.roles)) {
    redirect("/portal/login");
  }

  const { assignments, registrations } = await loadMyAssignments(
    toIdString(judge._id),
    session.competition_id,
    session.role
  );
  const competition = await getCurrentCompetition();

  return (
    <MyAssignmentsManager
      initialAssignments={assignments}
      registrations={registrations}
      judgingDueDate={
        competition?.judging_due_date
          ? new Date(competition.judging_due_date).toISOString()
          : null
      }
    />
  );
}
