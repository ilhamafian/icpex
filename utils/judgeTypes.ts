import { isScoringJudgeRole } from "@/schemas/userRole";

export { isScoringJudgeRole };

/** A track judge scores every rubric for their education track. */
export function canScoreAssignments(roles: readonly string[]): boolean {
  return roles.some((role) => isScoringJudgeRole(role));
}
