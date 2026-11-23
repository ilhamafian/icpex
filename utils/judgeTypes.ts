import { isScoringJudgeRole, isScoringRole } from "@/schemas/userRole";

export { isScoringJudgeRole, isScoringRole };

/** A judge or paper reviewer scores the rubrics for their assignment. */
export function canScoreAssignments(roles: readonly string[]): boolean {
  return roles.some((role) => isScoringRole(role));
}
