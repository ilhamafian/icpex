import { objectIdSchema } from "./objectId";
import { z } from "zod";

export const competitionSchema = z.object({
    _id: objectIdSchema.optional(),
    competition_id: z.string(),
    name: z.string(),
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
    status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED"]),
    created_at: z.coerce.date().optional(),
    updated_at: z.coerce.date().optional(),
});

export type Competition = z.infer<typeof competitionSchema>;
