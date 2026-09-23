import z from "zod";
import { objectIdSchema } from "./objectId";

export const judgeCriteriaTypeSchema = z.enum(["EBOOK", "THESIS"]);

export const judgeCriteriaSchema = z.object({
  _id: objectIdSchema.optional(),
  criteria_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  weight: z.number().min(0),
  type: judgeCriteriaTypeSchema,
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

/** Create payload — `criteria_id` is generated server-side from the name. */
export const judgeCriteriaInputSchema = judgeCriteriaSchema.omit({
  _id: true,
  criteria_id: true,
  created_at: true,
  updated_at: true,
});

/** Updates never change `criteria_id` once assigned. */
export const judgeCriteriaUpdateSchema = judgeCriteriaInputSchema.partial();

export type JudgeCriteria = z.infer<typeof judgeCriteriaSchema>;
export type JudgeCriteriaInput = z.infer<typeof judgeCriteriaInputSchema>;
export type JudgeCriteriaType = z.infer<typeof judgeCriteriaTypeSchema>;
