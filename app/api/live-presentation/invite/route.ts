import { NextRequest } from "next/server";

import {
  competitionEmailCopy,
  sendLivePresentationInviteEmail,
} from "@/lib/email";
import { CompetitionModel } from "@/models/Competition";
import { RegistrationModel } from "@/models/Registration";
import {
  competitionLivePresentationSchema,
  livePresentationSessionSchema,
} from "@/schemas/competitionSchema";
import { toIdString } from "@/schemas/objectId";
import { canManageLivePresentation } from "@/schemas/userRole";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import { loadJudgeLeaderReport } from "@/utils/judgeLeaderReports";
import { requireJudgeLeaderSession } from "@/utils/portalAuth";

/** Email nominated postgraduate participants who have not yet been invited. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireJudgeLeaderSession();
    if (!session || !canManageLivePresentation(session.role)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const competition = await getCurrentCompetition();
    if (!competition) {
      return createResponse(
        { error: "No published competition is open." },
        400
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = livePresentationSessionSchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Check the live session details.";
      return createResponse({ error: message }, 400);
    }

    const competitionId = toIdString(competition._id);
    await new CompetitionModel().update(
      competitionId,
      {
        live_presentation_date: parsed.data.date,
        live_presentation_time: parsed.data.time,
        live_presentation_platform: parsed.data.platform,
        live_presentation_meeting_url: parsed.data.meeting_url,
        live_presentation_reply_by: parsed.data.reply_by,
        live_presentation_join_minutes: parsed.data.join_minutes,
      },
      competitionLivePresentationSchema
    );

    const report = await loadJudgeLeaderReport(session.role);
    const waiting = report.marks
      .filter(
        (row) =>
          row.education_level === "POSTGRADUATE" && row.nominated && !row.invited
      )
      .sort((a, b) => {
        const scoreA = a.average_score ?? -1;
        const scoreB = b.average_score ?? -1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.registration_number.localeCompare(b.registration_number);
      });

    if (waiting.length === 0) {
      return createResponse({
        sent: 0,
        failed: 0,
        total: 0,
        message: "No nominated participants are waiting for an invitation.",
      });
    }

    const maxOrder = report.marks.reduce(
      (max, row) => Math.max(max, row.live_presentation_order ?? 0),
      0
    );
    const copy = competitionEmailCopy(competition);
    const model = new RegistrationModel();
    let sent = 0;
    let failed = 0;

    for (const [index, row] of waiting.entries()) {
      const order = maxOrder + index + 1;
      const registration = await model.findById(row.registration_id);
      const sameCompetition =
        registration &&
        toIdString(registration.competition_id) === competitionId;
      if (
        !registration ||
        !sameCompetition ||
        registration.live_presentation_invited_at ||
        registration.participant.education_level !== "POSTGRADUATE"
      ) {
        failed += 1;
        continue;
      }

      const to = registration.participant.email.trim();
      if (!to) {
        failed += 1;
        continue;
      }

      try {
        await sendLivePresentationInviteEmail({
          to,
          participantName: registration.participant.name,
          registrationNumber: registration.registration_number,
          trackName: row.category_name,
          projectTitle: registration.project.title,
          presentationOrder: order,
          sessionDate: parsed.data.date,
          sessionTime: parsed.data.time,
          platform: parsed.data.platform,
          meetingUrl: parsed.data.meeting_url,
          replyBy: parsed.data.reply_by,
          joinMinutes: parsed.data.join_minutes,
          copy,
        });
        await model.stampLivePresentationInvite(row.registration_id, order);
        sent += 1;
      } catch (error) {
        console.error("Live presentation invite failed:", error);
        failed += 1;
      }
    }

    if (sent === 0) {
      return createResponse(
        { error: "Failed to send the invitation email." },
        502
      );
    }

    return createResponse({ sent, failed, total: waiting.length });
  } catch (error) {
    return handleError(error);
  }
}
