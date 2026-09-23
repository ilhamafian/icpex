import { NextRequest } from "next/server";

import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { RegistrationModel } from "@/models/Registration";
import { UserModel } from "@/models/User";
import {
  judgeAssignmentUpdateSchema,
  type JudgeAssignment,
  type JudgeAssignmentType,
} from "@/schemas/judgeAssignmentsSchema";
import { toIdString } from "@/schemas/objectId";
import type { UserRole } from "@/schemas/userRole";
import { requireAdminSession } from "@/utils/adminAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { serializeJudgeAssignment } from "@/utils/serializeJudgeAssignment";

const ROLE_FOR_TYPE: Record<JudgeAssignmentType, UserRole> = {
  THESIS: "THESIS_JUDGE",
  EBOOK: "EBOOK_JUDGE",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const model = new JudgeAssignmentModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Assignment not found" }, 404);
    }

    const body = await req.json();
    const parsed = judgeAssignmentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const nextJudgeId = parsed.data.judge_id
      ? toIdString(parsed.data.judge_id)
      : toIdString(existing.judge_id);
    const nextRegistration =
      parsed.data.registration_number ?? existing.registration_number;
    const nextType = parsed.data.type ?? existing.type;

    if (parsed.data.registration_number) {
      const registration = await new RegistrationModel().findOne({
        registration_number: nextRegistration,
      });
      if (!registration) {
        return createResponse({ error: "Registration not found." }, 400);
      }
    }

    if (parsed.data.judge_id || parsed.data.type) {
      const judge = await new UserModel().findById(nextJudgeId);
      if (!judge) {
        return createResponse({ error: "Judge not found." }, 400);
      }
      const requiredRole = ROLE_FOR_TYPE[nextType];
      if (!judge.roles.includes(requiredRole)) {
        return createResponse(
          {
            error: `Judge must have the ${requiredRole} role for ${nextType} assignments.`,
          },
          400
        );
      }
      if (judge.status === "DISABLED") {
        return createResponse(
          { error: "Cannot assign a disabled judge." },
          400
        );
      }
    }

    const changedIdentity =
      nextJudgeId !== toIdString(existing.judge_id) ||
      nextRegistration !== existing.registration_number ||
      nextType !== existing.type;

    if (changedIdentity) {
      const duplicate = await model.findOne({
        judge_id: nextJudgeId,
        registration_number: nextRegistration,
        type: nextType,
      });
      if (duplicate && toIdString(duplicate._id) !== id) {
        return createResponse(
          { error: "This judge is already assigned to that registration." },
          409
        );
      }
    }

    const updatePayload: Partial<JudgeAssignment> = {};
    if (parsed.data.judge_id !== undefined) {
      updatePayload.judge_id = nextJudgeId;
    }
    if (parsed.data.registration_number !== undefined) {
      updatePayload.registration_number = parsed.data.registration_number;
    }
    if (parsed.data.type !== undefined) {
      updatePayload.type = parsed.data.type;
    }
    if (parsed.data.status !== undefined) {
      updatePayload.status = parsed.data.status;
    }

    await model.update(id, updatePayload, judgeAssignmentUpdateSchema);

    const updated = await model.findById(id);
    if (!updated) {
      return createResponse({ error: "Assignment not found" }, 404);
    }

    return createResponse({ assignment: serializeJudgeAssignment(updated) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const model = new JudgeAssignmentModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Assignment not found" }, 404);
    }

    await model.delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
