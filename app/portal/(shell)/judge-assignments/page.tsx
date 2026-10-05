import { JudgeAssignmentsManager } from "@/components/JudgeAssignmentsManager";
import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { UserModel } from "@/models/User";
import { toAssignmentRegistrationOption } from "@/utils/assignmentOptions";
import { findRegistrationsForCompetition } from "@/utils/competitionScope";
import { getCurrentCompetitionId } from "@/utils/currentCompetition";
import { JUDGE_ROLES } from "@/utils/portalAuth";
import { usersWithRolesFilter } from "@/utils/roleGrants";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { serializeUser } from "@/utils/serializeUser";
import { requirePortalSection } from "@/utils/requirePortalAccess";

async function loadAssignmentData(competitionId: string | null) {
  if (!competitionId) {
    return { assignments: [], judges: [], registrations: [] };
  }

  try {
    const [registrations, users] = await Promise.all([
      findRegistrationsForCompetition(competitionId),
      new UserModel().find(usersWithRolesFilter(JUDGE_ROLES, competitionId), {
        sort: { email: 1 },
      }),
    ]);

    const assignments = await new JudgeAssignmentModel().find(
      {
        registration_number: {
          $in: registrations.map((item) => item.registration_number),
        },
      },
      { sort: { created_at: -1 } }
    );

    return {
      assignments: assignments.map(serializeJudgeAssignment),
      judges: users.map(serializeUser),
      registrations: registrations.map(toAssignmentRegistrationOption),
    };
  } catch {
    return { assignments: [], judges: [], registrations: [] };
  }
}

export default async function JudgeAssignmentsPage() {
  await requirePortalSection("judge-assignments");
  const competitionId = await getCurrentCompetitionId();
  const { assignments, judges, registrations } =
    await loadAssignmentData(competitionId);

  return (
    <JudgeAssignmentsManager
      initialAssignments={assignments}
      judges={judges}
      competitionId={competitionId}
      registrations={registrations}
    />
  );
}
