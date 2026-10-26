import "server-only";

import { WithId } from "mongodb";

import {
  SCORE_BAND_KEYS,
  emptyScoreBands,
  type JudgeCriteria,
  type JudgeCriteriaBands,
  type ScoreBandKey,
} from "@/schemas/judgeCriteriaSchema";
import { toIdString } from "@/schemas/objectId";

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

type StoredJudgeCriteria = WithId<Partial<JudgeCriteria>> & {
  description?: string;
  component?: string;
  bands?: Partial<Record<ScoreBandKey, unknown>>;
  name?: string;
  criteria_id?: string;
  type?: JudgeCriteria["type"];
};

export type SerializedJudgeCriteria = {
  _id: string;
  criteria_id: string;
  name: string;
  component: string;
  bands: JudgeCriteriaBands;
  type: JudgeCriteria["type"];
  created_at?: string;
  updated_at?: string;
};

export function serializeJudgeCriteria(
  criteria: StoredJudgeCriteria
): SerializedJudgeCriteria {
  const bands = emptyScoreBands();
  for (const key of SCORE_BAND_KEYS) {
    const value = criteria.bands?.[key];
    if (typeof value === "string") bands[key] = value;
  }

  const component =
    typeof criteria.component === "string" && criteria.component.trim()
      ? criteria.component
      : typeof criteria.description === "string"
        ? criteria.description
        : "";

  return {
    _id: toIdString(criteria._id),
    criteria_id: criteria.criteria_id ?? "",
    name: criteria.name ?? "",
    component,
    bands,
    type: criteria.type ?? "THESIS",
    created_at: toIso(criteria.created_at),
    updated_at: toIso(criteria.updated_at),
  };
}
