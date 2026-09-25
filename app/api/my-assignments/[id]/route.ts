import { NextRequest } from "next/server";

import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { JudgeCriteriaModel } from "@/models/JudgeCriteria";
import {
  judgeAssignmentJudgeStatusSchema,
  judgeAssignmentScoreSubmitSchema,
  type JudgeAssignment,
} from "@/schemas/judgeAssignmentsSchema";
import { toIdString } from "@/schemas/objectId";
import { requireJudgeSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { resolveJudgeUser } from "@/utils/resolveJudgeUser";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { z } from "zod";

const scoresUpdateSchema = z.object({
  scores: judgeAssignmentScoreSubmitSchema.shape.scores,
  total_score: z.number(),
  submitted_at: z.coerce.date(),
});

async function loadOwnedAssignment(id: string, judgeId: string) {
  const model = new JudgeAssignmentModel();
  const existing = await model.findById(id);
  if (!existing) {
    return { error: "Assignment not found", status: 404 as const };
  }
  if (toIdString(existing.judge_id) !== judgeId) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { model, existing };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireJudgeSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const judge = await resolveJudgeUser(session);
    if (!judge) {
      return createResponse({ error: "Judge account not found." }, 401);
    }

    const { id } = await params;
    const owned = await loadOwnedAssignment(id, judge._id);
    if ("error" in owned) {
      return createResponse({ error: owned.error }, owned.status);
    }

    const body = (await req.json()) as { action?: string };
    const { model, existing } = owned;

    if (body.action === "status") {
      const parsed = judgeAssignmentJudgeStatusSchema.safeParse(body);
      if (!parsed.success) {
        return createResponse({ error: parsed.error.format() }, 400);
      }

      if (existing.status !== "PENDING") {
        return createResponse(
          { error: "Only pending assignments can be accepted or rejected." },
          400
        );
      }

      await model.update(
        id,
        { status: parsed.data.status },
        judgeAssignmentJudgeStatusSchema
      );
    } else if (body.action === "scores") {
      const parsed = judgeAssignmentScoreSubmitSchema.safeParse(body);
      if (!parsed.success) {
        return createResponse({ error: parsed.error.format() }, 400);
      }

      if (existing.status !== "ACCEPTED") {
        return createResponse(
          { error: "Accept the assignment before submitting scores." },
          400
        );
      }

      const criteria = await new JudgeCriteriaModel().find({
        type: existing.type,
      });
      const criteriaById = new Map(
        criteria.map((item) => [toIdString(item._id), item])
      );

      for (const score of parsed.data.scores) {
        const criteriaId = toIdString(score.criteria_id);
        if (!criteriaById.has(criteriaId)) {
          return createResponse(
            {
              error:
                "One or more criteria are invalid for this assignment type.",
            },
            400
          );
        }
      }

      const expectedIds = new Set(criteria.map((item) => toIdString(item._id)));
      const submittedIds = new Set(
        parsed.data.scores.map((score) => toIdString(score.criteria_id))
      );
      if (
        expectedIds.size > 0 &&
        (submittedIds.size !== expectedIds.size ||
          [...expectedIds].some((criteriaId) => !submittedIds.has(criteriaId)))
      ) {
        return createResponse(
          { error: "Scores must include every criterion for this type." },
          400
        );
      }

      let totalScore = 0;
      for (const score of parsed.data.scores) {
        const criteriaId = toIdString(score.criteria_id);
        const weight = criteriaById.get(criteriaId)?.weight ?? 1;
        totalScore += score.score * weight;
      }

      const scoresPayload: Pick<
        JudgeAssignment,
        "scores" | "total_score" | "submitted_at"
      > = {
        scores: parsed.data.scores.map((score) => ({
          criteria_id: toIdString(score.criteria_id),
          score: score.score,
          comments: score.comments ?? "",
        })),
        total_score: totalScore,
        submitted_at: new Date(),
      };

      await model.update(id, scoresPayload, scoresUpdateSchema);
    } else if (body.action === "clear_scores") {
      if (existing.status !== "ACCEPTED") {
        return createResponse(
          { error: "Only accepted assignments can have scores cleared." },
          400
        );
      }

      await model.clearScores(id);
    } else {
      return createResponse(
        { error: "Unknown action. Use status, scores, or clear_scores." },
        400
      );
    }

    const updated = await model.findById(id);
    if (!updated) {
      return createResponse({ error: "Assignment not found" }, 404);
    }

    return createResponse({ assignment: serializeJudgeAssignment(updated) });
  } catch (error) {
    return handleError(error);
  }
}

/** Clears the judge's scores on an assignment (does not unassign). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireJudgeSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const judge = await resolveJudgeUser(session);
    if (!judge) {
      return createResponse({ error: "Judge account not found." }, 401);
    }

    const { id } = await params;
    const owned = await loadOwnedAssignment(id, judge._id);
    if ("error" in owned) {
      return createResponse({ error: owned.error }, owned.status);
    }

    const { model, existing } = owned;
    if (existing.status !== "ACCEPTED") {
      return createResponse(
        { error: "Only accepted assignments can have scores cleared." },
        400
      );
    }

    if (!existing.scores?.length && !existing.submitted_at) {
      return createResponse({ error: "No scores to clear." }, 400);
    }

    await model.clearScores(id);
    const updated = await model.findById(id);
    return createResponse({
      ok: true,
      assignment: updated ? serializeJudgeAssignment(updated) : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
