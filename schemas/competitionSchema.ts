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
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

/** Create payload — `competition_id` is generated server-side from the name. */
export const competitionInputSchema = competitionSchema
  .omit({
    _id: true,
    competition_id: true,
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

export type Competition = z.infer<typeof competitionSchema>;
export type CompetitionInput = z.infer<typeof competitionInputSchema>;
export type CompetitionStatus = z.infer<typeof competitionStatusSchema>;
