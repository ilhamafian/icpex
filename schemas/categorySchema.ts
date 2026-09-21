import { objectIdSchema } from "./objectId";
import { z } from "zod";

export const categorySchema = z.object({
  _id: objectIdSchema.optional(),
  category_id: z.string().min(1),
  name: z.string().min(1),
});

/** Create payload — `category_id` is generated server-side from the name. */
export const categoryInputSchema = categorySchema.omit({
  _id: true,
  category_id: true,
});

/** Updates never change `category_id` once assigned. */
export const categoryUpdateSchema = categoryInputSchema.partial();

export type Category = z.infer<typeof categorySchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
