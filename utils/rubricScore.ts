import {
  SCORE_BAND_KEYS,
  type JudgeRubricBands,
} from "@/schemas/judgeRubricSchema";

export function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

export function weightTenths(weights: number[]) {
  return weights.reduce((sum, weight) => sum + Math.round(weight * 10), 0);
}

export function weightPercent(weights: number[]) {
  return weightTenths(weights) / 10;
}

export function weightsSumTo100(weights: number[]) {
  return weights.length > 0 && weightTenths(weights) === 1000;
}

type RubricComponentLike = {
  name: string;
  description: string;
  weight: number;
  bands: JudgeRubricBands;
};

type RubricLike = {
  name: string;
  components: RubricComponentLike[];
};

export function rubricIsReady(rubric: RubricLike) {
  if (!weightsSumTo100(rubric.components.map((component) => component.weight))) {
    return false;
  }
  return rubric.components.every(
    (component) =>
      component.name.trim().length > 0 &&
      component.description.trim().length > 0 &&
      SCORE_BAND_KEYS.every((key) => component.bands[key]?.trim())
  );
}

/** Why judges cannot submit, or null when every started rubric is ready. */
export function scoringBlockReason(rubrics: RubricLike[]) {
  const started = rubrics.filter((rubric) => rubric.components.length > 0);
  if (started.length === 0) {
    return "Ask a judge leader to add judging criteria.";
  }
  const incomplete = started.filter((rubric) => !rubricIsReady(rubric));
  if (incomplete.length === 0) return null;
  const names = incomplete.map((rubric) => rubric.name).join(", ");
  return `Scoring is paused until these rubrics are finished: ${names}. Each component needs its descriptions, and the weights must add up to 100%.`;
}

export function readyRubrics<T extends RubricLike>(rubrics: T[]) {
  return rubrics.filter((rubric) => rubricIsReady(rubric));
}

/** Weighted component score for one rubric. A full set of 10s is 10. */
export function weightedRubricScore(
  components: { score: number; weight: number }[]
) {
  return roundScore(
    components.reduce(
      (sum, component) => sum + (component.score * component.weight) / 100,
      0
    )
  );
}

/** Equal average of rubric scores. */
export function averageRubricScores(scores: number[]) {
  if (scores.length === 0) return 0;
  return roundScore(
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  );
}
