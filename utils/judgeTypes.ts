import type { JudgeAssignmentType } from "@/schemas/judgeAssignmentsSchema";

export function judgeTypesForRoles(roles: string[]): JudgeAssignmentType[] {
  const types: JudgeAssignmentType[] = [];
  if (roles.includes("THESIS_JUDGE")) types.push("THESIS");
  if (roles.includes("EBOOK_JUDGE")) types.push("EBOOK");
  if (roles.includes("JTEC_JUDGE")) types.push("JTEC");
  return types;
}
