import type { JudgeAssignmentType } from "@/schemas/judgeAssignmentsSchema";
import { isScoringJudgeRole } from "@/schemas/userRole";

export { isScoringJudgeRole };

/** A track judge can be assigned to either Thesis or JTEC work. */
export function judgeTypesForRoles(roles: readonly string[]): JudgeAssignmentType[] {
  if (roles.some((role) => isScoringJudgeRole(role))) {
    return ["THESIS", "JTEC"];
  }
  return [];
}
