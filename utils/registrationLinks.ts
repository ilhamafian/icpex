import {
  allowedEducationLevels,
  EDUCATION_LEVEL_LABELS,
  educationLevelSchema,
  type CompetitionEligibility,
  type EducationLevel,
} from "@/schemas/educationLevel";

export type RegistrationLink = { label: string; href: string };

/** One registration button per education level the competition accepts. */
export function registrationLinks(
  eligibility: CompetitionEligibility | undefined
): RegistrationLink[] {
  return allowedEducationLevels(eligibility).map((level) => ({
    label: `${EDUCATION_LEVEL_LABELS[level]} registration`,
    href: `/register?level=${level.toLowerCase()}`,
  }));
}

/** Parses the `?level=` query param written by `registrationLinks`. */
export function parseLevelParam(
  value: string | string[] | undefined
): EducationLevel | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = educationLevelSchema.safeParse(value.toUpperCase());
  return parsed.success ? parsed.data : undefined;
}
