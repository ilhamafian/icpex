import { z } from "zod";

import { isBlobStoreUrl } from "@/utils/blobUrl";
import { educationLevelSchema } from "./educationLevel";
import { objectIdSchema } from "./objectId";

export const judgeApplicationKindSchema = z.enum(["JUDGE", "REVIEWER"]);

export const APPLICANT_TITLES = [
  "Mr",
  "Ms",
  "Mrs",
  "Dr",
  "Prof.",
  "Assoc. Prof.",
  "Ir.",
  "Ts.",
] as const;

const applicationFields = {
  kind: judgeApplicationKindSchema,
  title: z.string().trim().min(1, "Select a title.").max(40),
  address: z.string().trim().min(1, "Address is required.").max(200),
  postcode: z.string().trim().min(1, "Postcode is required.").max(20),
  phone: z.string().trim().min(6, "Enter a mobile number.").max(30),
  field_of_expertise: z
    .string()
    .trim()
    .min(1, "Field of expertise is required.")
    .max(300),
  jury_experience: z.string().trim().max(2000).optional(),
  cv_url: z
    .string()
    .url()
    .refine(isBlobStoreUrl, "Upload your CV again."),
  cv_file_name: z
    .string()
    .trim()
    .min(1, "Upload your CV.")
    .max(200)
    .refine((name) => /\.(pdf|docx?)$/i.test(name), "Upload a PDF or Word CV."),
  declaration_accepted: z
    .boolean()
    .refine((value) => value, { message: "Accept the declaration to apply." }),
};

function requireJuryExperience(
  data: { kind: "JUDGE" | "REVIEWER"; jury_experience?: string },
  ctx: {
    addIssue: (issue: {
      code: "custom";
      message: string;
      path: (string | number)[];
    }) => void;
  }
) {
  if (data.kind === "JUDGE" && !data.jury_experience?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Describe your judging experience.",
      path: ["jury_experience"],
    });
  }
}

/** Stored on a user who applied from the public page. */
export const judgeApplicationSchema = z
  .object(applicationFields)
  .superRefine(requireJuryExperience);

/** What the public form sends, including the account fields. */
export const judgeApplicationFormSchema = z
  .object({
    ...applicationFields,
    education_level: educationLevelSchema,
    name: z.string().trim().min(1, "Name is required.").max(120),
    email: z.email(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    institution: z.object({
      name: z.string().trim().min(1, "Organisation is required."),
      country: z.string().trim().min(1, "Country is required."),
    }),
    national_id: z
      .string()
      .trim()
      .min(4, "Enter a national ID.")
      .max(32, "National ID is too long."),
    category_ids: z
      .array(objectIdSchema)
      .min(1, "Select at least one category."),
  })
  .superRefine(requireJuryExperience);

export type JudgeApplicationKind = z.infer<typeof judgeApplicationKindSchema>;
export type JudgeApplication = z.infer<typeof judgeApplicationSchema>;
export type JudgeApplicationForm = z.infer<typeof judgeApplicationFormSchema>;
