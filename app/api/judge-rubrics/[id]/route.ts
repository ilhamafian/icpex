import { NextRequest } from "next/server";

import { JudgeAssignmentModel } from "@/models/JudgeAssignment";
import { JudgeRubricModel } from "@/models/JudgeRubric";
import {
  judgeRubricStoredUpdateSchema,
  judgeRubricUpdateSchema,
  type JudgeRubric,
} from "@/schemas/judgeRubricSchema";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { buildRubricComponents } from "@/utils/buildRubricComponents";
import { educationLevelForRole } from "@/schemas/userRole";
import { requireJudgeLeaderSession } from "@/utils/portalAuth";
import { serializeJudgeRubric } from "@/utils/serializeJudgeRubric";

async function loadOwnedRubric(
  id: string,
  role: Parameters<typeof educationLevelForRole>[0],
  competitionId: string | null
) {
  if (!competitionId) {
    return { error: "Choose a competition first.", status: 400 as const };
  }
  const model = new JudgeRubricModel();
  const existing = await model.findById(id);
  if (!existing || toIdString(existing.competition_id) !== competitionId) {
    return { error: "Rubric not found.", status: 404 as const };
  }
  const track = educationLevelForRole(role);
  if (track && existing.education_level !== track) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { model, existing };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireJudgeLeaderSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const owned = await loadOwnedRubric(
      id,
      session.role,
      session.competition_id
    );
    if ("error" in owned) {
      return createResponse({ error: owned.error }, owned.status);
    }

    const body = await req.json();
    const parsed = judgeRubricUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse(
        { error: parsed.error.issues[0]?.message ?? "Invalid rubric." },
        400
      );
    }

    const update: Partial<JudgeRubric> = {};
    if (parsed.data.name !== undefined) {
      update.name = parsed.data.name;
    }

    if (parsed.data.components) {
      const existingIds = new Set(
        owned.existing.components.map((component) => toIdString(component._id))
      );
      const built = buildRubricComponents(parsed.data.components, existingIds);
      if ("error" in built) {
        return createResponse({ error: built.error }, 400);
      }

      const nextIds = new Set(
        built.components.map((component) => toIdString(component._id))
      );
      const removed = [...existingIds].filter((componentId) => !nextIds.has(componentId));
      const blocked = await new JudgeAssignmentModel().submittedComponentIds(
        removed
      );
      if (blocked.size > 0) {
        return createResponse(
          { error: "A component that already has submitted scores cannot be deleted." },
          409
        );
      }
      update.components = built.components;
    }

    await owned.model.update(id, update, judgeRubricStoredUpdateSchema);

    const updated = await owned.model.findById(id);
    if (!updated) {
      return createResponse({ error: "Rubric not found." }, 404);
    }
    return createResponse({ rubric: serializeJudgeRubric(updated) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireJudgeLeaderSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const owned = await loadOwnedRubric(
      id,
      session.role,
      session.competition_id
    );
    if ("error" in owned) {
      return createResponse({ error: owned.error }, owned.status);
    }

    const componentIds = owned.existing.components.map((component) =>
      toIdString(component._id)
    );
    const blocked = await new JudgeAssignmentModel().submittedComponentIds(
      componentIds
    );
    if (blocked.size > 0) {
      return createResponse(
        { error: "This rubric already has submitted scores." },
        409
      );
    }

    await owned.model.delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
