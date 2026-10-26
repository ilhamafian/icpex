import type { JudgeAssignmentType } from "@/schemas/judgeAssignmentsSchema";

const SCORING_JUDGE_ROLES = ["THESIS_JUDGE", "EBOOK_JUDGE", "JTEC_JUDGE"] as const;

export function isScoringJudgeRole(role: string): boolean {
  return (SCORING_JUDGE_ROLES as readonly string[]).includes(role);
}

export function judgeTypesForRoles(roles: string[]): JudgeAssignmentType[] {
  const types: JudgeAssignmentType[] = [];
  if (roles.includes("THESIS_JUDGE")) types.push("THESIS");
  if (roles.includes("EBOOK_JUDGE")) types.push("EBOOK");
  if (roles.includes("JTEC_JUDGE")) types.push("JTEC");
  return types;
}
