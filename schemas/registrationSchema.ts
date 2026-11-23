import { z } from "zod";
import { educationLevelSchema } from "./educationLevel";
import { objectIdSchema } from "./objectId";

/** Additional team members, not counting the team lead. */
export const MAX_TEAM_MEMBERS = 6;

/** Projects one university can enter in a single submission. */
export const MAX_PROJECTS_PER_SUBMISSION = 1;

/** Every Nth project from the same university (per competition) is free. */
export const FREE_PROJECT_EVERY = 6;

export const registrationSchema = z.object({
  _id: objectIdSchema.optional(),
  registration_number: z.string(),
  /** Absent on registrations created before multi-project submissions. */
  submission_id: objectIdSchema.optional(),
  /** Normalised university name used to count projects for the free rule. */
  institution_key: z.string().optional(),
  /** Fee charged for this project in the payment's currency — 0 when it was a free project. */
  fee: z.number().nonnegative().optional(),
  competition_id: objectIdSchema,
  category_id: objectIdSchema,
  participant: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    education_level: educationLevelSchema,
    institution: z.object({
      name: z.string().min(1),
      country: z.string().min(1),
    }),
    government_id: z.object({
      type: z.enum(["PASSPORT", "NATIONAL_ID", "DRIVING_LICENSE"]),
      number: z.string().min(1),
    }),
  }),
  project: z.object({
    title: z.string().min(1),
    abstract: z.string().min(1),
  }),
  team: z.object({
    lead: z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }),
    members: z.array(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })
    ).max(MAX_TEAM_MEMBERS, `A team can have at most ${MAX_TEAM_MEMBERS} members.`),
  }),
  supervisors: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
    })
  ),
  documents: z.array(
    z.object({
      type: z.enum([
        "ABSTRACT",
        "FULL_PAPER",
        "VIDEO_LINK",
        "PROJECT_REPORT",
        "PROJECT_PRESENTATION",
        "PROJECT_DEMO",
        "PROJECT_VIDEO",
        "PROJECT_PHOTO",
        "PROJECT_OTHER",
      ]),
      /** Competition document-requirement id when submitted from the public form. */
      requirement_id: z.string().min(1).optional(),
      /** Display name from the competition requirement (preferred over type labels). */
      label: z.string().min(1).optional(),
      file_name: z.string().min(1),
      file_url: z.string().min(1),
    })
  ),
  /** Raw upload-link token, kept so a reminder reuses the same URL. */
  document_upload_token: z.string().min(1).optional(),
  document_upload_token_hash: z.string().min(1).optional(),
  /** Set when the participant submits after-payment documents. The link then locks. */
  documents_submitted_at: z.coerce.date().optional(),
  status: z.enum([
    "SUBMITTED",
    "REVIEWING",
    "REJECTED",
    "ACCEPTED",
    "COMPLETED",
  ]),
  /** Set when a judge leader nominates this postgraduate for the 5MT live session. */
  live_presentation_nominated_at: z.coerce.date().optional(),
  /** Set after the live-presentation invitation email is sent. */
  live_presentation_invited_at: z.coerce.date().optional(),
  /** Presentation order written into that invitation. */
  live_presentation_order: z.number().int().positive().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Registration = z.infer<typeof registrationSchema>;

export const createRegistrationSchema = registrationSchema.omit({
  _id: true,
  document_upload_token: true,
  document_upload_token_hash: true,
  documents_submitted_at: true,
  live_presentation_nominated_at: true,
  live_presentation_invited_at: true,
  live_presentation_order: true,
  created_at: true,
  updated_at: true,
});

/** Reusable after-payment upload link, written once and kept for reminders. */
export const registrationDocumentLinkSchema = z.object({
  document_upload_token: z.string().min(1),
  document_upload_token_hash: z.string().min(1),
});

/** Replace the document list, and optionally lock the public upload page. */
export const registrationDocumentsSchema = z.object({
  documents: registrationSchema.shape.documents,
  documents_submitted_at: z.coerce.date().optional(),
});

export type CreateRegistration = z.infer<typeof createRegistrationSchema>;

/** Public competition registration form (system fields set on submit). */
export const registrationFormSchema = createRegistrationSchema.omit({
  registration_number: true,
  status: true,
});

export type RegistrationForm = z.infer<typeof registrationFormSchema>;

/** Secretary may advance registration review status. */
export const registrationStatusUpdateSchema = z.object({
  status: z.enum([
    "SUBMITTED",
    "REVIEWING",
    "REJECTED",
    "ACCEPTED",
    "COMPLETED",
  ]),
});

export type RegistrationStatusUpdate = z.infer<
  typeof registrationStatusUpdateSchema
>;

/** Judge leader toggles 5MT live-presentation nomination. Does not send email. */
export const livePresentationNominationSchema = z.object({
  nominated: z.boolean(),
});

export type LivePresentationNomination = z.infer<
  typeof livePresentationNominationSchema
>;
