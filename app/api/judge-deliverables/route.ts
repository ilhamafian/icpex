import { NextRequest } from "next/server";

import { JudgeDeliverableModel } from "@/models/JudgeDeliverable";
import { judgeDeliverablesInputSchema } from "@/schemas/judgeDeliverableSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireJudgeLeaderSession } from "@/utils/portalAuth";
import { serializeJudgeDeliverable } from "@/utils/serializeJudgeDeliverable";

export async function GET() {
  try {
    const session = await requireJudgeLeaderSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const deliverables = await new JudgeDeliverableModel().find(
      {},
      { sort: { type: 1 } }
    );

    return createResponse({
      deliverables: deliverables.map(serializeJudgeDeliverable),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireJudgeLeaderSession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = judgeDeliverablesInputSchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid deliverable weights.";
      return createResponse({ error: message }, 400);
    }

    const saved = await new JudgeDeliverableModel().saveWeights(
      parsed.data.deliverables
    );

    return createResponse({
      deliverables: saved.map(serializeJudgeDeliverable),
    });
  } catch (error) {
    return handleError(error);
  }
}
