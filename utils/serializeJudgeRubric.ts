import "server-only";

import { WithId } from "mongodb";

import {
  SCORE_BAND_KEYS,
  emptyScoreBands,
  type JudgeRubric,
  type JudgeRubricBands,
} from "@/schemas/judgeRubricSchema";
import {
  scoringAudienceOf,
  type ScoringAudience,
} from "@/schemas/scoringAudience";
import { toIdString } from "@/schemas/objectId";

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

export type SerializedJudgeRubricComponent = {
  _id: string;
  name: string;
  description: string;
  weight: number;
  sort_order: number;
  bands: JudgeRubricBands;
};

export type SerializedJudgeRubric = {
  _id: string;
  competition_id: string;
  education_level: JudgeRubric["education_level"];
  audience: ScoringAudience;
  name: string;
  sort_order: number;
  components: SerializedJudgeRubricComponent[];
  created_at?: string;
  updated_at?: string;
};

export function serializeJudgeRubric(
  rubric: WithId<JudgeRubric>
): SerializedJudgeRubric {
  const components = [...(rubric.components ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((component) => {
      const bands = emptyScoreBands();
      for (const key of SCORE_BAND_KEYS) {
        const value = component.bands?.[key];
        if (typeof value === "string") bands[key] = value;
      }
      return {
        _id: toIdString(component._id),
        name: component.name ?? "",
        description: component.description ?? "",
        weight: component.weight ?? 0,
        sort_order: component.sort_order ?? 0,
        bands,
      };
    });

  return {
    _id: toIdString(rubric._id),
    competition_id: toIdString(rubric.competition_id),
    education_level: rubric.education_level,
    audience: scoringAudienceOf(rubric.audience),
    name: rubric.name,
    sort_order: rubric.sort_order ?? 0,
    components,
    created_at: toIso(rubric.created_at),
    updated_at: toIso(rubric.updated_at),
  };
}
