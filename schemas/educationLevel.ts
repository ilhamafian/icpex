import { z } from "zod";

export const educationLevelSchema = z.enum(["UNDERGRADUATE", "POSTGRADUATE"]);

export type EducationLevel = z.infer<typeof educationLevelSchema>;

/** Which education levels a competition accepts. */
export const competitionEligibilitySchema = z.enum([
  "UNDERGRADUATE",
  "POSTGRADUATE",
  "BOTH",
]);

export type CompetitionEligibility = z.infer<
  typeof competitionEligibilitySchema
>;

/** Competitions created before eligibility existed accept both levels. */
export const DEFAULT_COMPETITION_ELIGIBILITY: CompetitionEligibility = "BOTH";

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  UNDERGRADUATE: "Undergraduate",
  POSTGRADUATE: "Postgraduate",
};

export const COMPETITION_ELIGIBILITY_LABELS: Record<
  CompetitionEligibility,
  string
> = {
  UNDERGRADUATE: "Undergraduate only",
  POSTGRADUATE: "Postgraduate only",
  BOTH: "Undergraduate & postgraduate",
};

const LEGACY_EDUCATION_LEVEL_LABELS: Record<string, string> = {
  DIPLOMA: "Diploma",
  GRADUATE: "Graduate",
  PHD: "PhD",
};

/** Label for a stored education level, including pre-migration values. */
export function educationLevelLabel(level: string): string {
  return (
    EDUCATION_LEVEL_LABELS[level as EducationLevel] ??
    LEGACY_EDUCATION_LEVEL_LABELS[level] ??
    level
  );
}

export function allowedEducationLevels(
  eligibility: CompetitionEligibility | undefined
): EducationLevel[] {
  switch (eligibility ?? DEFAULT_COMPETITION_ELIGIBILITY) {
    case "UNDERGRADUATE":
      return ["UNDERGRADUATE"];
    case "POSTGRADUATE":
      return ["POSTGRADUATE"];
    default:
      return ["UNDERGRADUATE", "POSTGRADUATE"];
  }
}
