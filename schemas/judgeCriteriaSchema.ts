import z from "zod";
import { objectIdSchema } from "./objectId";

export const judgeCriteriaTypeSchema = z.enum(["THESIS", "JTEC"]);

export const SCORE_BAND_KEYS = ["0-2", "3-4", "5-6", "7-8", "9-10"] as const;

export type ScoreBandKey = (typeof SCORE_BAND_KEYS)[number];

export const SCORE_BAND_LABELS: Record<ScoreBandKey, string> = {
  "0-2": "0–2",
  "3-4": "3–4",
  "5-6": "5–6",
  "7-8": "7–8",
  "9-10": "9–10",
};

const bandText = z.string().trim().min(1);

export const judgeCriteriaBandsSchema = z.object({
  "0-2": bandText,
  "3-4": bandText,
  "5-6": bandText,
  "7-8": bandText,
  "9-10": bandText,
});

export const judgeCriteriaSchema = z.object({
  _id: objectIdSchema.optional(),
  criteria_id: z.string().min(1),
  name: z.string().trim().min(1),
  component: z.string().trim().min(1),
  bands: judgeCriteriaBandsSchema,
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
export type JudgeCriteriaBands = z.infer<typeof judgeCriteriaBandsSchema>;

export function emptyScoreBands(): Record<ScoreBandKey, string> {
  return {
    "0-2": "",
    "3-4": "",
    "5-6": "",
    "7-8": "",
    "9-10": "",
  };
}
