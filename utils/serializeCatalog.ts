import "server-only";

import { WithId } from "mongodb";

import type { Category } from "@/schemas/categorySchema";
import type { Competition } from "@/schemas/competitionSchema";
import { toIdString } from "@/schemas/objectId";

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

export type SerializedCompetition = {
  _id: string;
  competition_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: Competition["status"];
  created_at?: string;
  updated_at?: string;
};

export type SerializedCategory = {
  _id: string;
  category_id: string;
  name: string;
};

export function serializeCompetition(
  competition: WithId<Competition>
): SerializedCompetition {
  return {
    _id: toIdString(competition._id),
    competition_id: competition.competition_id,
    name: competition.name,
    start_date: toIso(competition.start_date)!,
    end_date: toIso(competition.end_date)!,
    status: competition.status,
    created_at: toIso(competition.created_at),
    updated_at: toIso(competition.updated_at),
  };
}

export function serializeCategory(
  category: WithId<Category>
): SerializedCategory {
  return {
    _id: toIdString(category._id),
    category_id: category.category_id,
    name: category.name,
  };
}
