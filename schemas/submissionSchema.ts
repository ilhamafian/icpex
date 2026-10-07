import { z } from "zod";

import { objectIdSchema } from "./objectId";
import {
  MAX_PROJECTS_PER_SUBMISSION,
  registrationSchema,
} from "./registrationSchema";

export const institutionSchema = z.object({
  name: z.string().trim().min(1, "University name is required."),
  country: z.string().trim().min(1, "Country is required."),
});

/** One project inside a submission — the university is shared, so it is omitted. */
export const submissionProjectSchema = z.object({
  category_id: objectIdSchema,
  participant: registrationSchema.shape.participant.omit({ institution: true }),
  project: registrationSchema.shape.project,
  team: registrationSchema.shape.team,
  supervisors: registrationSchema.shape.supervisors,
  documents: registrationSchema.shape.documents,
});

export const submissionSchema = z.object({
  _id: objectIdSchema.optional(),
  submission_number: z.string(),
  competition_id: objectIdSchema,
  institution: institutionSchema,
  institution_key: z.string().min(1),
  registration_ids: z.array(objectIdSchema),
  project_count: z.number().int().positive(),
  free_count: z.number().int().nonnegative(),
  amount: z.number().nonnegative(),
  receipt_url: z.string().url().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

/** Public registration payload: one university, 1–6 projects, one receipt. */
export const submissionFormSchema = z.object({
  competition_id: objectIdSchema,
  institution: institutionSchema,
  projects: z
    .array(submissionProjectSchema)
    .min(1, "Add at least one project.")
    .max(
      MAX_PROJECTS_PER_SUBMISSION,
      `You can submit at most ${MAX_PROJECTS_PER_SUBMISSION} projects at a time.`
    ),
  receipt_url: z.string().url().optional(),
});

export type Institution = z.infer<typeof institutionSchema>;
export type SubmissionProject = z.infer<typeof submissionProjectSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type SubmissionForm = z.infer<typeof submissionFormSchema>;
