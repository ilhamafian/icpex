import { NextRequest } from "next/server";

import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { RegistrationModel } from "@/models/Registration";
import { UserModel } from "@/models/User";
import {
  judgeAssignmentInputSchema,
  judgeAssignmentsSchema,
  type JudgeAssignmentType,
} from "@/schemas/judgeAssignmentsSchema";
import { toIdString } from "@/schemas/objectId";
import type { UserRole } from "@/schemas/userRole";
import { requireAdminSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";

const ROLE_FOR_TYPE: Record<JudgeAssignmentType, UserRole> = {
  THESIS: "THESIS_JUDGE",
  EBOOK: "EBOOK_JUDGE",
};

async function validateAssignmentRefs(input: {
  judge_id: string;
  registration_number: string;
  type: JudgeAssignmentType;
}) {
  const registration = await new RegistrationModel().findOne({
    registration_number: input.registration_number,
  });
  if (!registration) {
    return { error: "Registration not found.", status: 400 as const };
  }

  const judge = await new UserModel().findById(input.judge_id);
  if (!judge) {
    return { error: "Judge not found.", status: 400 as const };
  }

  const requiredRole = ROLE_FOR_TYPE[input.type];
  if (!judge.roles.includes(requiredRole)) {
    return {
      error: `Judge must have the ${requiredRole} role for ${input.type} assignments.`,
      status: 400 as const,
    };
  }

  if (judge.status === "DISABLED") {
    return { error: "Cannot assign a disabled judge.", status: 400 as const };
  }

  return { registration, judge };
}

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const assignments = await new JudgeAssignmentModel().find(
      {},
      { sort: { type: 1, created_at: -1 } }
    );

    return createResponse({
      assignments: assignments.map(serializeJudgeAssignment),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
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
      type: parsed.data.type,
    });
    if ("error" in refs) {
      return createResponse({ error: refs.error }, refs.status);
    }

    const model = new JudgeAssignmentModel();
    const duplicate = await model.findOne({
      judge_id: judgeId,
      registration_number: parsed.data.registration_number,
      type: parsed.data.type,
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
        type: parsed.data.type,
        status: parsed.data.status ?? "PENDING",
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
