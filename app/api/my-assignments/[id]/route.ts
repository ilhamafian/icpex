import { NextRequest } from "next/server";

import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { JudgeRubricModel } from "@/models/JudgeRubric";
import { CompetitionModel } from "@/models/Competition";
import {
  judgeAssignmentScoreSubmitSchema,
  type JudgeAssignment,
} from "@/schemas/judgeAssignmentsSchema";
import { objectIdSchema, toIdString } from "@/schemas/objectId";
import { RegistrationModel } from "@/models/Registration";
import { requireJudgeSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import {
  formatJudgingDueDate,
  isJudgingClosed,
} from "@/utils/competitionDates";
import { registrationCompetitionId } from "@/utils/competitionScope";
import { canScoreAssignments } from "@/utils/judgeTypes";
import {
  averageRubricScores,
  readyRubrics,
  scoringBlockReason,
  weightedRubricScore,
} from "@/utils/rubricScore";
import {
  scoringAudienceOf,
  withScoringAudience,
} from "@/schemas/scoringAudience";
import { serializeJudgeRubric } from "@/utils/serializeJudgeRubric";
import { canAccessEducationLevel } from "@/utils/trackAccess";
import {
  resolveJudgeUser,
  type PortalJudgeUser,
} from "@/utils/resolveJudgeUser";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { z } from "zod";

const scoresUpdateSchema = z.object({
  scores: z.array(
    z.object({
      component_id: objectIdSchema,
      score: z.number().int().min(1).max(10),
      weight: z.number(),
      comments: z.string(),
    })
  ),
  comments: z.string(),
  total_score: z.number(),
  submitted_at: z.coerce.date(),
});

async function loadOwnedAssignment(
  id: string,
  judge: PortalJudgeUser,
  competitionId: string | null,
  role: PortalJudgeUser["roles"][number]
) {
  const model = new JudgeAssignmentModel();
  const existing = await model.findById(id);
  if (!existing) {
    return { error: "Assignment not found", status: 404 as const };
  }
  if (
    toIdString(existing.judge_id) !== judge._id ||
    !canScoreAssignments(judge.roles)
  ) {
    return { error: "Forbidden", status: 403 as const };
  }

  const registration = await new RegistrationModel().findOne({
    registration_number: existing.registration_number,
  });
  if (
    !registration ||
    registrationCompetitionId(registration) !== competitionId ||
    !canAccessEducationLevel(role, registration.participant.education_level)
  ) {
    return {
      error: "This assignment is not part of the current competition.",
      status: 403 as const,
    };
  }

  return {
    model,
    existing,
    competitionId: registrationCompetitionId(registration),
    educationLevel: registration.participant.education_level,
  };
}

async function scoringClosedMessage(competitionId: string | null) {
  if (!competitionId) return null;
  const competition = await new CompetitionModel().findById(competitionId);
  const due = competition?.judging_due_date;
  if (!due || !isJudgingClosed(due)) return null;
  return `Scoring closed on ${formatJudgingDueDate(due)}.`;
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
    const owned = await loadOwnedAssignment(
      id,
      judge,
      session.competition_id,
      session.role
    );
    if ("error" in owned) {
      return createResponse({ error: owned.error }, owned.status);
    }

    const body = (await req.json()) as { action?: string };
    const { model, existing } = owned;

    if (body.action === "scores") {
      const closed = await scoringClosedMessage(owned.competitionId);
      if (closed) {
        return createResponse({ error: closed }, 400);
      }

      const parsed = judgeAssignmentScoreSubmitSchema.safeParse(body);
      if (!parsed.success) {
        return createResponse({ error: parsed.error.format() }, 400);
      }

      if (existing.status !== "ACCEPTED") {
        return createResponse(
          { error: "This assignment was rejected and cannot be scored." },
          400
        );
      }

      const rubricDocs = await new JudgeRubricModel().find(
        withScoringAudience(
          {
            competition_id: owned.competitionId,
            education_level: owned.educationLevel,
          },
          scoringAudienceOf(existing.audience)
        ) as never,
        { sort: { sort_order: 1, created_at: 1 } }
      );
      const rubrics = rubricDocs.map(serializeJudgeRubric);
      const blocked = scoringBlockReason(rubrics);
      if (blocked) {
        return createResponse({ error: blocked }, 400);
      }
      const ready = readyRubrics(rubrics);
      const componentWeight = new Map(
        ready.flatMap((rubric) =>
          rubric.components.map(
            (component) => [component._id, component.weight] as const
          )
        )
      );

      for (const score of parsed.data.scores) {
        const componentId = toIdString(score.component_id);
        if (!componentWeight.has(componentId)) {
          return createResponse(
            { error: "One or more components are not part of this rubric." },
            400
          );
        }
      }

      const expectedIds = new Set(componentWeight.keys());
      const submittedIds = new Set(
        parsed.data.scores.map((score) => toIdString(score.component_id))
      );
      if (
        submittedIds.size !== expectedIds.size ||
        [...expectedIds].some((componentId) => !submittedIds.has(componentId))
      ) {
        return createResponse(
          { error: "Scores must include every component." },
          400
        );
      }

      const scoreById = new Map(
        parsed.data.scores.map(
          (score) => [toIdString(score.component_id), score.score] as const
        )
      );
      const totalScore = averageRubricScores(
        ready.map((rubric) =>
          weightedRubricScore(
            rubric.components.map((component) => ({
              score: scoreById.get(component._id) ?? 0,
              weight: component.weight,
            }))
          )
        )
      );

      const scoresPayload: Pick<
        JudgeAssignment,
        "scores" | "comments" | "total_score" | "submitted_at"
      > = {
        scores: parsed.data.scores.map((score) => {
          const componentId = toIdString(score.component_id);
          return {
            component_id: componentId,
            score: score.score,
            weight: componentWeight.get(componentId) ?? 0,
            comments: "",
          };
        }),
        comments: parsed.data.comments.trim(),
        total_score: totalScore,
        submitted_at: new Date(),
      };

      await model.update(id, scoresPayload, scoresUpdateSchema);
    } else if (body.action === "clear_scores") {
      const closed = await scoringClosedMessage(owned.competitionId);
      if (closed) {
        return createResponse({ error: closed }, 400);
      }

      if (existing.status !== "ACCEPTED") {
        return createResponse(
          { error: "Only accepted assignments can have scores cleared." },
          400
        );
      }

      await model.clearScores(id);
    } else {
      return createResponse(
        { error: "Unknown action. Use scores or clear_scores." },
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
    const owned = await loadOwnedAssignment(
      id,
      judge,
      session.competition_id,
      session.role
    );
    if ("error" in owned) {
      return createResponse({ error: owned.error }, owned.status);
    }

    const { model, existing, competitionId } = owned;
    if (existing.status !== "ACCEPTED") {
      return createResponse(
        { error: "Only accepted assignments can have scores cleared." },
        400
      );
    }

    const closed = await scoringClosedMessage(competitionId);
    if (closed) {
      return createResponse({ error: closed }, 400);
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
