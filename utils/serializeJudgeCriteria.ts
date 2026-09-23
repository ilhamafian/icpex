import "server-only";

import { WithId } from "mongodb";

import type { JudgeCriteria } from "@/schemas/judgeCriteriaSchema";
import { toIdString } from "@/schemas/objectId";

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

export type SerializedJudgeCriteria = {
  _id: string;
  criteria_id: string;
  name: string;
  description: string;
  weight: number;
  type: JudgeCriteria["type"];
  created_at?: string;
  updated_at?: string;
};

export function serializeJudgeCriteria(
  criteria: WithId<JudgeCriteria>
): SerializedJudgeCriteria {
  return {
    _id: toIdString(criteria._id),
    criteria_id: criteria.criteria_id,
    name: criteria.name,
    description: criteria.description,
    weight: criteria.weight,
    type: criteria.type,
    created_at: toIso(criteria.created_at),
    updated_at: toIso(criteria.updated_at),
  };
}
