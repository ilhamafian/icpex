import { NextRequest } from "next/server";

import { JudgeCriteriaModel } from "@/models/JudgeCriteria";
import {
  judgeCriteriaUpdateSchema,
  type JudgeCriteria,
} from "@/schemas/judgeCriteriaSchema";
import { requireAdminSession } from "@/utils/adminAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { serializeJudgeCriteria } from "@/utils/serializeJudgeCriteria";

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
    const model = new JudgeCriteriaModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Judging criteria not found" }, 404);
    }

    const body = await req.json();
    const parsed = judgeCriteriaUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await model.update(
      id,
      parsed.data as Partial<JudgeCriteria>,
      judgeCriteriaUpdateSchema
    );

    const updated = await model.findById(id);
    if (!updated) {
      return createResponse({ error: "Judging criteria not found" }, 404);
    }

    return createResponse({ criteria: serializeJudgeCriteria(updated) });
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
    const model = new JudgeCriteriaModel();
    const existing = await model.findById(id);
    if (!existing) {
      return createResponse({ error: "Judging criteria not found" }, 404);
    }

    await model.delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
