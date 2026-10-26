import "server-only";

import { WithId } from "mongodb";

import type { JudgeDeliverable } from "@/schemas/judgeDeliverableSchema";
import type { JudgeCriteriaType } from "@/schemas/judgeCriteriaSchema";
import { toIdString } from "@/schemas/objectId";

export type SerializedJudgeDeliverable = {
  _id: string;
  type: JudgeCriteriaType;
  weight: number;
};

export function serializeJudgeDeliverable(
  deliverable: WithId<JudgeDeliverable>
): SerializedJudgeDeliverable {
  return {
    _id: toIdString(deliverable._id),
    type: deliverable.type,
    weight: deliverable.weight,
  };
}
