import { NextRequest } from "next/server";

import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getCurrentCompetition } from "@/utils/currentCompetition";
import {
  scheduledReminderKind,
  sendJudgeReminders,
  stampScheduledReminder,
} from "@/utils/judgeReminders";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(request: NextRequest) {
  try {
    if (!authorized(request)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const competition = await getCurrentCompetition();
    if (!competition) {
      return createResponse({ skipped: true, reason: "No published competition." });
    }

    const kind = scheduledReminderKind(competition);
    if (!kind) {
      return createResponse({ skipped: true, reason: "No reminder is due." });
    }

    const delivery = await sendJudgeReminders({
      competition,
      kind,
      track: null,
    });

    if (delivery.total > 0) {
      await stampScheduledReminder(toIdString(competition._id), kind);
    }

    return createResponse({
      competitionId: toIdString(competition._id),
      kind,
      ...delivery,
    });
  } catch (error) {
    return handleError(error);
  }
}

/** Vercel Cron calls GET. POST is available for a manual trigger with the same secret. */
export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
