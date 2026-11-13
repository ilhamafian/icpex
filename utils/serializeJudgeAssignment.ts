import "server-only";

import { WithId } from "mongodb";

import type { JudgeAssignment } from "@/schemas/judgeAssignmentsSchema";
import { toIdString } from "@/schemas/objectId";

function toIso(value: Date | string | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

export type SerializedJudgeScore = {
  component_id: string;
  score: number;
  weight?: number;
  comments: string;
};

export type SerializedJudgeAssignment = {
  _id: string;
  judge_id: string;
  registration_number: string;
  status: JudgeAssignment["status"];
  scores: SerializedJudgeScore[];
  comments: string;
  total_score: number;
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
};

export function serializeJudgeAssignment(
  assignment: WithId<JudgeAssignment>
): SerializedJudgeAssignment {
  return {
    _id: toIdString(assignment._id),
    judge_id: toIdString(assignment.judge_id),
    registration_number: assignment.registration_number,
    status: assignment.status,
    scores: (assignment.scores ?? []).map((score) => ({
      component_id: toIdString(score.component_id ?? score.criteria_id),
      score: score.score,
      ...(score.weight === undefined ? {} : { weight: score.weight }),
      comments: score.comments ?? "",
    })),
    comments: assignment.comments ?? "",
    total_score: assignment.total_score ?? 0,
    submitted_at: toIso(assignment.submitted_at),
    created_at: toIso(assignment.created_at),
    updated_at: toIso(assignment.updated_at),
  };
}
