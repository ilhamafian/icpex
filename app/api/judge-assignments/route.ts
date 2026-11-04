import { NextRequest } from "next/server";

import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import {
  judgeAssignmentInputSchema,
  judgeAssignmentsSchema,
} from "@/schemas/judgeAssignmentsSchema";
import { toIdString } from "@/schemas/objectId";
import { requireJudgeLeaderSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";
import { educationLevelForRole } from "@/schemas/userRole";
import { validateAssignmentRefs } from "@/utils/validateJudgeAssignment";
import { RegistrationModel } from "@/models/Registration";
import type { EducationLevel } from "@/schemas/educationLevel";

async function filterAssignments<T extends { registration_number: string }>(
  assignments: T[],
  track: EducationLevel
) {
  if (assignments.length === 0) return assignments;
  const registrations = await new RegistrationModel().find({
    registration_number: {
      $in: assignments.map((item) => item.registration_number),
    },
  });
  const allowed = new Set(
    registrations
      .filter((item) => item.participant.education_level === track)
      .map((item) => item.registration_number)
  );
  return assignments.filter((item) => allowed.has(item.registration_number));
}

export async function GET() {
  try {
    const session = await requireJudgeLeaderSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const model = new JudgeAssignmentModel();
    await model.collapseDuplicates();
    const assignments = await model.find({}, { sort: { created_at: -1 } });
    const track = educationLevelForRole(session.role);
    const visible = track
      ? await filterAssignments(assignments, track)
      : assignments;

    return createResponse({
      assignments: visible.map(serializeJudgeAssignment),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireJudgeLeaderSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = judgeAssignmentInputSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const judgeId = toIdString(parsed.data.judge_id);
    const refs = await validateAssignmentRefs({
      judge_id: judgeId,
      registration_number: parsed.data.registration_number,
      actorRole: session.role,
    });
    if ("error" in refs) {
      return createResponse({ error: refs.error }, refs.status);
    }

    const model = new JudgeAssignmentModel();
    await model.collapseDuplicates();
    const duplicate = await model.findOne({
      judge_id: judgeId,
      registration_number: parsed.data.registration_number,
    });
    if (duplicate) {
      return createResponse(
        { error: "This judge is already assigned to that registration." },
        409
      );
    }

    const created = await model.create(
      judgeAssignmentsSchema.parse({
        judge_id: judgeId,
        registration_number: parsed.data.registration_number,
        status: "ACCEPTED",
        scores: [],
        total_score: 0,
      })
    );

    return createResponse(
      { assignment: serializeJudgeAssignment(created) },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
