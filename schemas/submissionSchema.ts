import { z } from "zod";

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

/**
 * Documents attached to a project. Required/optional rules come from the
 * competition's `document_requirements` and are enforced in the API.
 */
const submissionDocumentsSchema = z.array(
  registrationSchema.shape.documents.element.extend({
    requirement_id: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
  })
);

/** One project inside a submission — the university is shared, so it is omitted. */
export const submissionProjectSchema = z.object({
  category_id: objectIdSchema,
  participant: registrationSchema.shape.participant.omit({ institution: true }),
  project: registrationSchema.shape.project,
  team: registrationSchema.shape.team,
  supervisors: registrationSchema.shape.supervisors,
  documents: submissionDocumentsSchema,
});

/** A secretary note that a receipt did not match the amount due. */
export const paymentAdjustmentSchema = z.object({
  type: z.enum(["UNDERPAID", "OVERPAID"]),
  amount: z.number().positive(),
  currency: currencySchema,
  /** The receipt that was checked when the adjustment was made. */
  receipt_url: z.string().url().optional(),
  created_at: z.coerce.date(),
});

export const submissionSchema = z.object({
  _id: objectIdSchema.optional(),
  submission_number: z.string(),
  competition_id: objectIdSchema,
  /** Set when a signed-in participant creates the submission. */
  participant_id: objectIdSchema.optional(),
  institution: institutionSchema,
  institution_key: z.string().min(1),
  registration_ids: z.array(objectIdSchema),
  project_count: z.number().int().positive(),
  free_count: z.number().int().nonnegative(),
  amount: z.number().nonnegative(),
  currency: currencySchema.optional(),
  /**
   * Raw payment-link token, kept so a resend uses the same URL.
   * Lookup uses the hash. The link does not expire.
   */
  payment_token: z.string().min(1).optional(),
  payment_token_hash: z.string().min(1).optional(),
  payment_requested_at: z.coerce.date().optional(),
  payment_reminded_at: z.coerce.date().optional(),
  /** Set when a receipt was underpaid. Null once the submission is paid. */
  balance_due: z.number().positive().nullable().optional(),
  balance_currency: currencySchema.optional(),
  payment_adjustments: z.array(paymentAdjustmentSchema).optional(),
  paid_at: z.coerce.date().optional(),
  invoice_number: z.string().min(1).optional(),
  /** Only on submissions made before payment moved to after secretary review. */
  receipt_url: z.string().url().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

/** Public registration payload: one university, one project. Payment comes later. */
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
});

/** Secretary price check — one amount per project, before the payment email is sent. */
export const submissionFeesSchema = z.object({
  fees: z
    .array(
      z.object({
        registration_id: objectIdSchema,
        amount: z.number().nonnegative(),
      })
    )
    .min(1),
});

/** Fields written when the payment link is created or the request email goes out. */
export const submissionPaymentLinkSchema = z.object({
  payment_token: z.string().min(1).optional(),
  payment_token_hash: z.string().min(1).optional(),
  payment_requested_at: z.coerce.date().optional(),
});

/** Fields written when the secretary verifies, adjusts, or reminds about a payment. */
export const submissionSettlementSchema = z.object({
  payment_reminded_at: z.coerce.date().optional(),
  balance_due: z.number().positive().nullable().optional(),
  balance_currency: currencySchema.optional(),
  payment_adjustments: z.array(paymentAdjustmentSchema).optional(),
  paid_at: z.coerce.date().optional(),
  invoice_number: z.string().min(1).optional(),
});

/** Secretary decision on an uploaded receipt. */
const adjustmentDecision = {
  amount: z.number().positive("Enter an amount above zero."),
  currency: currencySchema,
};

export const paymentVerificationSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("PAID") }),
  z.object({ outcome: z.literal("FAILED") }),
  z.object({ outcome: z.literal("UNDERPAID"), ...adjustmentDecision }),
  z.object({ outcome: z.literal("OVERPAID"), ...adjustmentDecision }),
]);

export type PaymentAdjustment = z.infer<typeof paymentAdjustmentSchema>;
export type PaymentVerification = z.infer<typeof paymentVerificationSchema>;

export const submissionAmountSchema = z.object({
  amount: z.number().nonnegative(),
  free_count: z.number().int().nonnegative(),
});

export type Institution = z.infer<typeof institutionSchema>;
export type SubmissionProject = z.infer<typeof submissionProjectSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type SubmissionForm = z.infer<typeof submissionFormSchema>;
