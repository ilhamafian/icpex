import { z } from "zod";

import { objectIdSchema } from "./objectId";

export const MAX_CO_ORGANISERS = 12;

export const coOrganiserSchema = z.object({
  _id: objectIdSchema.optional(),
  name: z.string().trim().min(1, "Name is required.").max(80),
  image_url: z.string().url(),
  order: z.number().int().nonnegative(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export const coOrganiserInputSchema = coOrganiserSchema.pick({
  name: true,
  image_url: true,
});

export const coOrganiserOrderSchema = coOrganiserSchema.pick({
  order: true,
});

export type CoOrganiser = z.infer<typeof coOrganiserSchema>;
export type CoOrganiserInput = z.infer<typeof coOrganiserInputSchema>;
