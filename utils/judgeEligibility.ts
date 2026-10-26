import type {
  CompetitionEligibility,
  EducationLevel,
} from "@/schemas/educationLevel";
import { toIdString } from "@/schemas/objectId";
import { normalizeInstitution } from "@/utils/institutionKey";

export type JudgeProfileMatch = {
  institution_key: string;
  category_ids: readonly (string | { toHexString(): string })[];
  education_eligibility: CompetitionEligibility;
};

export type AssignmentTarget = {
  category_id: string;
  education_level: EducationLevel;
  institution_key?: string;
  institution_name: string;
};

/**
 * Why a judge who already has a profile cannot take this project.
 * Judges without a profile are unrestricted so existing accounts stay assignable.
 */
export function judgeProfileBlockReason(
  profile: JudgeProfileMatch | undefined,
  target: AssignmentTarget
): string | null {
  if (!profile) return null;

  const storedKey = target.institution_key?.trim();
  const projectKey = storedKey || normalizeInstitution(target.institution_name);
  if (projectKey && profile.institution_key === projectKey) {
    return "Same university";
  }

  const allowed = new Set(
    profile.category_ids.map((id) => toIdString(id).toLowerCase())
  );
  if (!allowed.has(target.category_id.toLowerCase())) {
    return "Different category";
  }

  if (
    profile.education_eligibility !== "BOTH" &&
    profile.education_eligibility !== target.education_level
  ) {
    return "Does not judge this level";
  }

  return null;
}
