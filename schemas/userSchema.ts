import { z } from "zod";
import { objectIdSchema } from "./objectId";

export const userSchema = z.object({
  _id: objectIdSchema.optional(),
  email: z.email(),
  password: z.string().min(1).optional(),
  role: z.enum(["admin", "secretary", "thesis_judge", "ebook_judge"]).default("secretary"),
  email_verified: z.boolean().default(false),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export const updateUserSchema = userSchema
  .omit({ email: true, password: true })
  .partial();

export const publicUserSchema = userSchema.omit({
  password: true,
});

export type User = z.infer<typeof userSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;

export {
  signupUserSchema,
  loginUserSchema,
  adminLoginSchema,
  type SignupUser,
  type LoginUser,
  type AdminLogin,
} from "./auth";
