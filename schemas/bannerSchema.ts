import { objectIdSchema } from "./objectId";
import { z } from "zod";

export const bannerSchema = z.object({
  _id: objectIdSchema.optional(),
  /** One banner per competition — `_id` of the competition as a hex string. */
  competition_id: z.string().regex(/^[a-fA-F0-9]{24}$/),
  eyebrow: z.string().trim().max(60).default(""),
  headline: z.string().trim().min(1, "Headline is required.").max(120),
  subheadline: z.string().trim().max(300).default(""),
  image_url: z.string().url().or(z.literal("")).default(""),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export const bannerInputSchema = bannerSchema.omit({
  _id: true,
  competition_id: true,
  created_at: true,
  updated_at: true,
});

export type Banner = z.infer<typeof bannerSchema>;
export type BannerInput = z.infer<typeof bannerInputSchema>;
