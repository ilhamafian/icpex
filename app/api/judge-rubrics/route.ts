import { NextRequest } from "next/server";

import { JudgeRubricModel } from "@/models/JudgeRubric";
import {
  judgeRubricCreateSchema,
  judgeRubricSchema,
} from "@/schemas/judgeRubricSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { resolveRubricTrack } from "@/utils/judgeRubricAccess";
import { requireScoringLeaderSession } from "@/utils/portalAuth";
import { leaderAudiences } from "@/schemas/userRole";
import {
  scoringAudienceOf,
  withScoringAudience,
} from "@/schemas/scoringAudience";
import { serializeJudgeRubric } from "@/utils/serializeJudgeRubric";

export async function GET(req: NextRequest) {
  try {
    const session = await requireScoringLeaderSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }
    if (!session.competition_id) {
      return createResponse({ error: "Choose a competition first." }, 400);
    }

    const requested = req.nextUrl.searchParams.get("education_level");
    const track = resolveRubricTrack(
      session.role,
      requested ?? undefined
    );
    const requestedAudience = req.nextUrl.searchParams.get("audience");
    const allowed = leaderAudiences(session.role);
    if (
      requestedAudience &&
      !allowed.includes(scoringAudienceOf(requestedAudience))
    ) {
      return createResponse({ error: "Forbidden" }, 403);
    }
    const model = new JudgeRubricModel();
    const base = track.ok
      ? {
          competition_id: session.competition_id,
          education_level: track.level,
        }
      : { competition_id: session.competition_id };
    const query = requestedAudience
      ? withScoringAudience(base, scoringAudienceOf(requestedAudience))
      : base;
    const rubrics = await model.find(query as never, {
      sort: { sort_order: 1, created_at: 1 },
    });

    const visible = requestedAudience
      ? rubrics
      : rubrics.filter((rubric) =>
          allowed.includes(scoringAudienceOf(rubric.audience))
        );

    return createResponse({
      rubrics: visible.map(serializeJudgeRubric),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireScoringLeaderSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }
    if (!session.competition_id) {
      return createResponse({ error: "Choose a competition first." }, 400);
    }

    const body = await req.json();
    const parsed = judgeRubricCreateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse(
        { error: parsed.error.issues[0]?.message ?? "Invalid rubric." },
        400
      );
    }

    const track = resolveRubricTrack(
      session.role,
      parsed.data.education_level
    );
    if (!track.ok) {
      return createResponse({ error: track.error }, track.status);
    }

    const audience = scoringAudienceOf(parsed.data.audience);
    if (!leaderAudiences(session.role).includes(audience)) {
      return createResponse({ error: "Forbidden" }, 403);
    }
    const model = new JudgeRubricModel();
    const existing = await model.find(
      withScoringAudience(
        {
          competition_id: session.competition_id,
          education_level: track.level,
        },
        audience
      ) as never
    );
    const sort_order =
      existing.reduce(
        (max, rubric) => Math.max(max, rubric.sort_order ?? 0),
        -1
      ) + 1;

    const created = await model.create(
      judgeRubricSchema.parse({
        competition_id: session.competition_id,
        education_level: track.level,
        audience,
        name: parsed.data.name,
        sort_order,
        components: [],
      })
    );

    return createResponse({ rubric: serializeJudgeRubric(created) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
