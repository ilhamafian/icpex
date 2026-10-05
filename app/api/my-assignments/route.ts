import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { requireJudgeSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { findRegistrationsForCompetition } from "@/utils/competitionScope";
import { resolveJudgeUser } from "@/utils/resolveJudgeUser";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";

export async function GET() {
  try {
    const session = await requireJudgeSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const judge = await resolveJudgeUser(session);
    if (!judge) {
      return createResponse({ error: "Judge account not found." }, 401);
    }

    const registrations = await findRegistrationsForCompetition(
      session.competition_id
    );
    const assignments =
      registrations.length === 0
        ? []
        : await new JudgeAssignmentModel().find(
            {
              judge_id: judge._id,
              registration_number: {
                $in: registrations.map((item) => item.registration_number),
              },
            },
            { sort: { type: 1, created_at: -1 } }
          );

    return createResponse({
      assignments: assignments.map(serializeJudgeAssignment),
    });
  } catch (error) {
    return handleError(error);
  }
}
