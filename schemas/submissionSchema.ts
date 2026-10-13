import { z } from "zod";

import { MALAYSIA, MALAYSIA_UNIVERSITIES } from "@/utils/institutions";

import { objectIdSchema } from "./objectId";
import { currencySchema } from "./paymentSchema";
import {
  MAX_PROJECTS_PER_SUBMISSION,
  registrationSchema,
} from "./registrationSchema";

export const institutionSchema = z.object({
  name: z.string().trim().min(1, "University name is required."),
  country: z.string().trim().min(1, "Country is required."),
});

const VIDEO_LINK_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "drive.google.com",
];

export function isAllowedVideoLink(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      VIDEO_LINK_HOSTS.includes(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

/** Abstract (required), full paper (optional) and video link (required). */
const submissionDocumentsSchema = z
  .array(
    registrationSchema.shape.documents.element.extend({
      type: z.enum(["ABSTRACT", "FULL_PAPER", "VIDEO_LINK"]),
    })
  )
  .superRefine((documents, ctx) => {
    const count = (type: string) =>
      documents.filter((d) => d.type === type).length;

    if (count("ABSTRACT") !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["abstract"],
        message: "Please upload your abstract.",
      });
    }
    if (count("FULL_PAPER") > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["full_paper"],
        message: "Only one full paper can be uploaded.",
      });
    }

    const videos = documents.filter((d) => d.type === "VIDEO_LINK");
    if (videos.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["video_link"],
        message: "Video link is required.",
      });
    } else if (!isAllowedVideoLink(videos[0].file_url)) {
      ctx.addIssue({
        code: "custom",
        path: ["video_link"],
        message: "Enter a valid Google Drive or YouTube link.",
      });
    }
  });

/** One project inside a submission — the university is shared, so it is omitted. */
export const submissionProjectSchema = z.object({
  category_id: objectIdSchema,
  participant: registrationSchema.shape.participant.omit({ institution: true }),
  project: registrationSchema.shape.project,
  team: registrationSchema.shape.team,
  supervisors: registrationSchema.shape.supervisors,
  documents: submissionDocumentsSchema,
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
  currency: currencySchema.optional(),
  /** Only on submissions made before payment moved to after secretary review. */
  receipt_url: z.string().url().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

/** Malaysian universities are priced by type, so they must come from the list. */
const institutionFormSchema = institutionSchema.refine(
  (institution) =>
    institution.country !== MALAYSIA ||
    Object.values(MALAYSIA_UNIVERSITIES).some((names) =>
      names.includes(institution.name)
    ),
  { path: ["name"], message: "Select your university from the list." }
);

/** Public registration payload: one university, 1–6 projects. Payment comes later. */
export const submissionFormSchema = z.object({
  competition_id: objectIdSchema,
  institution: institutionFormSchema,
  projects: z
    .array(submissionProjectSchema)
    .min(1, "Add at least one project.")
    .max(
      MAX_PROJECTS_PER_SUBMISSION,
      `You can submit at most ${MAX_PROJECTS_PER_SUBMISSION} projects at a time.`
    ),
});

export type Institution = z.infer<typeof institutionSchema>;
export type SubmissionProject = z.infer<typeof submissionProjectSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type SubmissionForm = z.infer<typeof submissionFormSchema>;
