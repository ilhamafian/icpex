import { documentRequirementsSchema } from "./documentRequirement";
import { competitionEligibilitySchema } from "./educationLevel";
import { objectIdSchema } from "./objectId";
import { z } from "zod";

export const competitionStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "COMPLETED",
]);

export const closingCeremonyModeSchema = z.enum(["ONLINE", "PHYSICAL"]);

export type ClosingCeremonyMode = z.infer<typeof closingCeremonyModeSchema>;

export const CLOSING_CEREMONY_MODE_LABELS: Record<ClosingCeremonyMode, string> =
  {
    ONLINE: "Online",
    PHYSICAL: "Physical",
  };

export const competitionSchema = z.object({
  _id: objectIdSchema.optional(),
  competition_id: z.string().min(1),
  name: z.string().min(1),
  /**
   * Long title used in participant and judge emails. Falls back to `name` when
   * absent (older competitions).
   */
  formal_name: z.string().min(1).optional(),
  /** Competition theme line used in emails. */
  theme: z.string().min(1).optional(),
  /**
   * “Who can participate” / category label for the undergraduate stream.
   * e.g. Undergraduate Innovation Competition
   */
  undergraduate_stream_name: z.string().min(1).optional(),
  /**
   * “Who can participate” / category label for the postgraduate stream.
   * e.g. Postgraduate Five-Minute Thesis (5MT) Competition …
   */
  postgraduate_stream_name: z.string().min(1).optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  /** Last day for registration fee payment, shown in emails. */
  payment_deadline: z.coerce.date().optional(),
  /** First day of the judging window. End of window is `judging_due_date`. */
  judging_start_date: z.coerce.date().optional(),
  /** Calendar date judges must submit scores by. Optional so older competitions still load. */
  judging_due_date: z.coerce.date().optional(),
  closing_ceremony_date: z.coerce.date().optional(),
  closing_ceremony_mode: closingCeremonyModeSchema.optional(),
  /** Local time as HH:mm. Null/omitted until the secretariat confirms a time. */
  closing_ceremony_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm")
    .nullish(),
  status: competitionStatusSchema,
  eligibility: competitionEligibilitySchema,
  /**
   * Per-stream document uploads shown on the registration form.
   * Older competitions omit this and fall back to default requirements.
   */
  document_requirements: documentRequirementsSchema.optional(),
  /** Set after the one-time “judging has started” email to assigned judges. */
  judge_start_reminder_sent_at: z.coerce.date().optional(),
  /** Set after the one-time email 3 days before the scoring due date. */
  judge_due_reminder_sent_at: z.coerce.date().optional(),
  /** Shared 5MT live-session details, filled when invitations are sent. */
  live_presentation_date: z.coerce.date().optional(),
  live_presentation_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm")
    .optional(),
  live_presentation_platform: z.string().min(1).optional(),
  live_presentation_meeting_url: z.string().url().optional(),
  live_presentation_reply_by: z.coerce.date().optional(),
  live_presentation_join_minutes: z.number().int().min(1).max(180).optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

/** Create payload — `competition_id` is generated server-side from the name. */
export const competitionInputSchema = competitionSchema
  .omit({
    _id: true,
    competition_id: true,
    judge_start_reminder_sent_at: true,
    judge_due_reminder_sent_at: true,
    live_presentation_date: true,
    live_presentation_time: true,
    live_presentation_platform: true,
    live_presentation_meeting_url: true,
    live_presentation_reply_by: true,
    live_presentation_join_minutes: true,
    created_at: true,
    updated_at: true,
  })
  .extend({
    formal_name: z.string().min(1),
    theme: z.string().min(1),
    payment_deadline: z.coerce.date(),
    judging_start_date: z.coerce.date(),
    judging_due_date: z.coerce.date(),
    closing_ceremony_date: z.coerce.date(),
    closing_ceremony_mode: closingCeremonyModeSchema,
  });

/** Updates never change `competition_id` once assigned. */
export const competitionUpdateSchema = competitionInputSchema.partial();

/** Internal stamps so scheduled judge reminders are sent only once. */
export const competitionReminderStampSchema = z
  .object({
    judge_start_reminder_sent_at: z.coerce.date(),
    judge_due_reminder_sent_at: z.coerce.date(),
  })
  .partial();

const livePresentationTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");

/** Body of the send-invitations request. */
export const livePresentationSessionSchema = z.object({
  date: z.coerce.date(),
  time: livePresentationTimeSchema,
  platform: z.string().trim().min(1),
  meeting_url: z.string().trim().url(),
  reply_by: z.coerce.date(),
  join_minutes: z.coerce.number().int().min(1).max(180),
});

/** Stored on the competition when invitations are sent. */
export const competitionLivePresentationSchema = z.object({
  live_presentation_date: z.date(),
  live_presentation_time: livePresentationTimeSchema,
  live_presentation_platform: z.string().min(1),
  live_presentation_meeting_url: z.string().url(),
  live_presentation_reply_by: z.date(),
  live_presentation_join_minutes: z.number().int().min(1).max(180),
});

export type LivePresentationSession = z.infer<
  typeof livePresentationSessionSchema
>;

/** Values for the send dialog. Empty strings until a session has been saved. */
export type LivePresentationDraft = {
  date: string;
  time: string;
  platform: string;
  meeting_url: string;
  reply_by: string;
  join_minutes: number;
};

export function emptyLivePresentationDraft(): LivePresentationDraft {
  return {
    date: "",
    time: "",
    platform: "",
    meeting_url: "",
    reply_by: "",
    join_minutes: 15,
  };
}

function calendarDate(value: Date | string | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function livePresentationDraft(
  competition: Pick<
    Competition,
    | "live_presentation_date"
    | "live_presentation_time"
    | "live_presentation_platform"
    | "live_presentation_meeting_url"
    | "live_presentation_reply_by"
    | "live_presentation_join_minutes"
  > | null
): LivePresentationDraft {
  if (!competition) return emptyLivePresentationDraft();
  return {
    date: calendarDate(competition.live_presentation_date),
    time: competition.live_presentation_time ?? "",
    platform: competition.live_presentation_platform ?? "",
    meeting_url: competition.live_presentation_meeting_url ?? "",
    reply_by: calendarDate(competition.live_presentation_reply_by),
    join_minutes: competition.live_presentation_join_minutes ?? 15,
  };
}

export type Competition = z.infer<typeof competitionSchema>;
export type CompetitionInput = z.infer<typeof competitionInputSchema>;
export type CompetitionStatus = z.infer<typeof competitionStatusSchema>;

/** Stream display names required for the education levels the competition accepts. */
export function missingStreamNameError(
  data: Pick<
    Competition,
    "eligibility" | "undergraduate_stream_name" | "postgraduate_stream_name"
  >
): string | null {
  const needsUndergrad =
    data.eligibility === "UNDERGRADUATE" || data.eligibility === "BOTH";
  const needsPostgrad =
    data.eligibility === "POSTGRADUATE" || data.eligibility === "BOTH";
  if (needsUndergrad && !data.undergraduate_stream_name?.trim()) {
    return "Undergraduate stream name is required.";
  }
  if (needsPostgrad && !data.postgraduate_stream_name?.trim()) {
    return "Postgraduate stream name is required.";
  }
  return null;
}
