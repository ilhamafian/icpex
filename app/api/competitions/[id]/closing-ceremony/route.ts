import { NextRequest } from "next/server";

import {
  competitionEmailCopy,
  sendClosingCeremonyJudgeEmail,
  sendClosingCeremonyParticipantEmail,
} from "@/lib/email";
import { CompetitionModel } from "@/models/Competition";
import {
  closingCeremonyInviteSchema,
  competitionClosingCeremonySchema,
} from "@/schemas/competitionSchema";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import {
  loadClosingCeremonyJudges,
  loadClosingCeremonyParticipants,
} from "@/utils/closingCeremonyAudience";
import { requireSuperAdminSession } from "@/utils/portalAuth";

async function deliver<T>(items: T[], send: (item: T) => Promise<void>) {
  const results = await Promise.allSettled(items.map((item) => send(item)));
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Closing ceremony email failed:", result.reason);
    }
  }
  const failed = results.filter((result) => result.status === "rejected").length;
  return { sent: items.length - failed, failed, total: items.length };
}

function httpUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Recipient counts for the send dialog, before any email goes out. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const competition = await new CompetitionModel().findById(id);
    if (!competition) {
      return createResponse({ error: "Competition not found" }, 404);
    }

    const competitionId = toIdString(competition._id);
    const [participants, judges] = await Promise.all([
      loadClosingCeremonyParticipants(competitionId),
      loadClosingCeremonyJudges(competitionId),
    ]);
    return createResponse({
      participants: participants.length,
      judges: judges.length,
    });
  } catch (error) {
    return handleError(error);
  }
}

/** Email paid participants, or judges and judge leaders, the closing ceremony. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const competition = await new CompetitionModel().findById(id);
    if (!competition) {
      return createResponse({ error: "Competition not found" }, 404);
    }
    if (!competition.closing_ceremony_date || !competition.closing_ceremony_mode) {
      return createResponse(
        {
          error:
            "Set the closing ceremony date and mode under Competitions & Categories.",
        },
        400
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = closingCeremonyInviteSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Check the ceremony details.";
      return createResponse({ error: message }, 400);
    }

    const mode = competition.closing_ceremony_mode;
    const platform = parsed.data.platform;
    const venue = parsed.data.venue;
    const meetingUrl = httpUrl(parsed.data.meeting_url);
    const attendanceUrl = httpUrl(parsed.data.attendance_url);

    if (mode === "ONLINE") {
      if (!platform) {
        return createResponse({ error: "Enter the platform." }, 400);
      }
      if (!meetingUrl) {
        return createResponse({ error: "Enter a meeting link." }, 400);
      }
    } else if (!venue) {
      return createResponse({ error: "Enter the venue." }, 400);
    }

    if (parsed.data.audience === "participants" && !attendanceUrl) {
      return createResponse(
        { error: "Enter the attendance registration link." },
        400
      );
    }

    const competitionId = toIdString(competition._id);
    await new CompetitionModel().update(
      competitionId,
      {
        closing_ceremony_time: parsed.data.time,
        closing_ceremony_reply_by: parsed.data.reply_by,
        closing_ceremony_join_minutes: parsed.data.join_minutes,
        ...(mode === "ONLINE"
          ? {
              closing_ceremony_platform: platform,
              closing_ceremony_meeting_url: meetingUrl ?? undefined,
            }
          : { closing_ceremony_venue: venue }),
        ...(attendanceUrl
          ? { closing_ceremony_attendance_url: attendanceUrl }
          : {}),
      },
      competitionClosingCeremonySchema
    );

    const copy = competitionEmailCopy({
      ...competition,
      closing_ceremony_time: parsed.data.time,
    });
    const event = {
      date: competition.closing_ceremony_date,
      time: parsed.data.time,
      mode,
      platform,
      meetingUrl: meetingUrl ?? undefined,
      venue,
      replyBy: parsed.data.reply_by,
    };

    if (parsed.data.audience === "participants") {
      if (!attendanceUrl) {
        return createResponse(
          { error: "Enter the attendance registration link." },
          400
        );
      }
      const recipients = await loadClosingCeremonyParticipants(competitionId);
      if (recipients.length === 0) {
        return createResponse({
          sent: 0,
          failed: 0,
          total: 0,
          message: "No paid participants to email.",
        });
      }

      const delivery = await deliver(recipients, (recipient) =>
        sendClosingCeremonyParticipantEmail({
          to: recipient.to,
          participantName: recipient.name,
          registrationNumber: recipient.registrationNumber,
          joinMinutes: parsed.data.join_minutes,
          attendanceUrl,
          copy,
          ...event,
        })
      );

      if (delivery.sent === 0) {
        return createResponse(
          { error: "Failed to send the closing ceremony invitation." },
          502
        );
      }

      return createResponse({
        sent: delivery.sent,
        failed: delivery.failed,
        total: delivery.total,
        warning:
          delivery.failed > 0
            ? `Sent to ${delivery.sent} of ${delivery.total} participants.`
            : undefined,
      });
    }

    const recipients = await loadClosingCeremonyJudges(competitionId);
    if (recipients.length === 0) {
      return createResponse({
        sent: 0,
        failed: 0,
        total: 0,
        message: "No judges or judge leaders to email.",
      });
    }

    const delivery = await deliver(recipients, (recipient) =>
      sendClosingCeremonyJudgeEmail({
        to: recipient.to,
        judgeName: recipient.name,
        copy,
        ...event,
      })
    );

    if (delivery.sent === 0) {
      return createResponse(
        { error: "Failed to send the closing ceremony invitation." },
        502
      );
    }

    return createResponse({
      sent: delivery.sent,
      failed: delivery.failed,
      total: delivery.total,
      warning:
        delivery.failed > 0
          ? `Sent to ${delivery.sent} of ${delivery.total} judges.`
          : undefined,
    });
  } catch (error) {
    return handleError(error);
  }
}
