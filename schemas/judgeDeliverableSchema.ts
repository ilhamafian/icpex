import z from "zod";

import { objectIdSchema } from "./objectId";
import { judgeCriteriaTypeSchema } from "./judgeCriteriaSchema";

/** True when the value has at most one digit after the decimal point. */
export function hasAtMostOneDecimal(value: number) {
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-6;
}

export const judgeDeliverableWeightSchema = z
  .number()
  .min(0)
  .max(100)
  .refine(hasAtMostOneDecimal, "Use at most one decimal place.");

export const judgeDeliverableSchema = z.object({
  _id: objectIdSchema.optional(),
  type: judgeCriteriaTypeSchema,
  weight: judgeDeliverableWeightSchema,
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export const judgeDeliverablesInputSchema = z
  .object({
    deliverables: z
      .array(
        z.object({
          type: judgeCriteriaTypeSchema,
          weight: judgeDeliverableWeightSchema,
        })
      )
      .length(2),
  })
  .refine(
    (value) => {
      const types = new Set(value.deliverables.map((item) => item.type));
      return types.size === 2 && types.has("THESIS") && types.has("JTEC");
    },
    { message: "Include both Thesis and JTEC." }
  )
  .refine(
    (value) =>
      value.deliverables.reduce(
        (sum, item) => sum + Math.round(item.weight * 10),
        0
      ) === 1000,
    { message: "Thesis and JTEC must add up to 100%." }
  );

export type JudgeDeliverable = z.infer<typeof judgeDeliverableSchema>;
export type JudgeDeliverablesInput = z.infer<
  typeof judgeDeliverablesInputSchema
>;
