import { NextRequest } from "next/server";

import { JudgeCriteriaModel } from "@/models/JudgeCriteria";
import {
  judgeCriteriaInputSchema,
  judgeCriteriaSchema,
} from "@/schemas/judgeCriteriaSchema";
import { requireAdminSession } from "@/utils/portalAuth";
import { createResponse, handleError } from "@/utils/apiHelper";
import { serializeJudgeCriteria } from "@/utils/serializeJudgeCriteria";
import { uniqueSlug } from "@/utils/slug";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const criteria = await new JudgeCriteriaModel().find(
      {},
      { sort: { type: 1, name: 1 } }
    );

    return createResponse({
      criteria: criteria.map(serializeJudgeCriteria),
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
    const parsed = judgeCriteriaInputSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const model = new JudgeCriteriaModel();
    const criteria_id = await uniqueSlug(parsed.data.name, async (slug) => {
      const existing = await model.findOne({ criteria_id: slug });
      return Boolean(existing);
    });

    const created = await model.create(
      judgeCriteriaSchema.parse({
        ...parsed.data,
        criteria_id,
      })
    );

    return createResponse(
      { criteria: serializeJudgeCriteria(created) },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
