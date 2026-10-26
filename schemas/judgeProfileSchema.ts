import { z } from "zod";

import { competitionEligibilitySchema } from "@/schemas/educationLevel";
import { objectIdSchema } from "@/schemas/objectId";
import { COUNTRIES, MALAYSIA, MALAYSIA_UNIVERSITIES } from "@/utils/institutions";

const judgeInstitutionSchema = z.object({
  name: z.string().trim().min(1, "University is required."),
  country: z.string().trim().min(1, "Country is required."),
});

const judgeProfileFields = {
  institution: judgeInstitutionSchema,
  national_id: z
    .string()
    .trim()
    .min(4, "Enter a national ID.")
    .max(32, "National ID is too long."),
  category_ids: z
    .array(objectIdSchema)
    .min(1, "Select at least one category."),
  education_eligibility: competitionEligibilitySchema,
};

function knownUniversity<T extends { institution: { name: string; country: string } }>(
  schema: z.ZodType<T>
) {
  return schema
    .refine(
      (profile) =>
        (COUNTRIES as readonly string[]).includes(profile.institution.country),
      { path: ["institution", "country"], message: "Select a country." }
    )
    .refine(
      (profile) =>
        profile.institution.country !== MALAYSIA ||
        Object.values(MALAYSIA_UNIVERSITIES).some((names) =>
          names.includes(profile.institution.name)
        ),
      {
        path: ["institution", "name"],
        message: "Select your university from the list.",
      }
    );
}

/** What the invite form sends. `institution_key` is added on the server. */
export const judgeProfileInputSchema = knownUniversity(
  z.object(judgeProfileFields)
);

/** Stored on the user after the invitation is accepted. */
export const judgeProfileSchema = knownUniversity(
  z.object({
    ...judgeProfileFields,
    institution_key: z.string().min(1),
  })
);

export type JudgeProfileInput = z.infer<typeof judgeProfileInputSchema>;
export type JudgeProfile = z.infer<typeof judgeProfileSchema>;
