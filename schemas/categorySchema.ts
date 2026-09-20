import { objectIdSchema } from "./objectId";
import { z } from "zod";

export const categorySchema = z.object({
    _id: objectIdSchema.optional(),
    category_id: z.string(),
    name: z.string(),
});

export type Category = z.infer<typeof categorySchema>;
