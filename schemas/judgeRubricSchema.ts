import z from "zod";

import { educationLevelSchema } from "./educationLevel";
import { objectIdSchema } from "./objectId";

/** True when the value has at most one digit after the decimal point. */
export function hasAtMostOneDecimal(value: number) {
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-6;
}

export const SCORE_BAND_KEYS = ["1-2", "3-4", "5-6", "7-8", "9-10"] as const;

export type ScoreBandKey = (typeof SCORE_BAND_KEYS)[number];

export const SCORE_BAND_LABELS: Record<ScoreBandKey, string> = {
  "1-2": "1–2",
  "3-4": "3–4",
  "5-6": "5–6",
  "7-8": "7–8",
  "9-10": "9–10",
};

const bandText = z.string().trim().min(1);

export const judgeRubricBandsSchema = z.object({
  "1-2": bandText,
  "3-4": bandText,
  "5-6": bandText,
  "7-8": bandText,
  "9-10": bandText,
});

export const judgeComponentWeightSchema = z
  .number()
  .gt(0)
  .max(100)
  .refine(hasAtMostOneDecimal, "Use at most one decimal place.");

export const judgeRubricComponentInputSchema = z.object({
  _id: objectIdSchema.optional(),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  weight: judgeComponentWeightSchema,
  bands: judgeRubricBandsSchema,
});

export const judgeRubricComponentSchema = judgeRubricComponentInputSchema.extend({
  _id: objectIdSchema,
  sort_order: z.number().int().nonnegative(),
});

export const judgeRubricSchema = z.object({
  _id: objectIdSchema.optional(),
  competition_id: objectIdSchema,
  education_level: educationLevelSchema,
  name: z.string().trim().min(1),
  sort_order: z.number().int().nonnegative(),
  components: z.array(judgeRubricComponentSchema).default([]),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export const judgeRubricCreateSchema = z.object({
  name: z.string().trim().min(1),
  education_level: educationLevelSchema.optional(),
});

export const judgeRubricUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    components: z.array(judgeRubricComponentInputSchema).optional(),
  })
  .refine((value) => value.name !== undefined || value.components !== undefined, {
    message: "Nothing to update.",
  });

/** Stored fields a leader may change. No defaults, so a rename does not clear components. */
export const judgeRubricStoredUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  components: z.array(judgeRubricComponentSchema).optional(),
});

export type JudgeRubric = z.infer<typeof judgeRubricSchema>;
export type JudgeRubricComponent = z.infer<typeof judgeRubricComponentSchema>;
export type JudgeRubricComponentInput = z.infer<
  typeof judgeRubricComponentInputSchema
>;
export type JudgeRubricBands = z.infer<typeof judgeRubricBandsSchema>;
export type JudgeRubricCreate = z.infer<typeof judgeRubricCreateSchema>;
export type JudgeRubricUpdate = z.infer<typeof judgeRubricUpdateSchema>;

export function emptyScoreBands(): Record<ScoreBandKey, string> {
  return {
    "1-2": "",
    "3-4": "",
    "5-6": "",
    "7-8": "",
    "9-10": "",
  };
}
