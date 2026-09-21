import { objectIdSchema } from "./objectId";
import { z } from "zod";

export const competitionStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "COMPLETED",
]);

export const competitionSchema = z.object({
  _id: objectIdSchema.optional(),
  competition_id: z.string().min(1),
  name: z.string().min(1),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  status: competitionStatusSchema,
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

/** Create payload — `competition_id` is generated server-side from the name. */
export const competitionInputSchema = competitionSchema.omit({
  _id: true,
  competition_id: true,
  created_at: true,
  updated_at: true,
});

/** Updates never change `competition_id` once assigned. */
export const competitionUpdateSchema = competitionInputSchema.partial();

export type Competition = z.infer<typeof competitionSchema>;
export type CompetitionInput = z.infer<typeof competitionInputSchema>;
export type CompetitionStatus = z.infer<typeof competitionStatusSchema>;
