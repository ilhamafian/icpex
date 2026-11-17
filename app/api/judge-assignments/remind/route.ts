import { createResponse, handleError } from "@/utils/apiHelper";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { sendJudgeReminders } from "@/utils/judgeReminders";
import { requireJudgeLeaderSession } from "@/utils/portalAuth";
import { educationLevelForRole } from "@/schemas/userRole";

/** Judge leader emails judges on their track who still have unscored assignments. */
export async function POST() {
  try {
    const session = await requireJudgeLeaderSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const competition = await getCurrentCompetition();
    if (!competition) {
      return createResponse(
        { error: "No published competition is open for judging." },
        400
      );
    }

    const delivery = await sendJudgeReminders({
      competition,
      kind: "unscored",
      track: educationLevelForRole(session.role),
    });

    if (delivery.total === 0) {
      return createResponse({
        sent: 0,
        failed: 0,
        total: 0,
        message: "Every assigned judge has already submitted their scores.",
      });
    }

    if (delivery.sent === 0) {
      return createResponse(
        { error: "Failed to send the reminder email." },
        502
      );
    }

    return createResponse({
      sent: delivery.sent,
      failed: delivery.failed,
      total: delivery.total,
    });
  } catch (error) {
    return handleError(error);
  }
}
