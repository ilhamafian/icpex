import { z } from "zod";
import { objectIdSchema } from "./objectId";

export const userSchema = z.object({
  _id: objectIdSchema.optional(),
  email: z.email(),
  password: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "user"]).default("user"),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export const signupUserSchema = userSchema.pick({
  email: true,
  password: true,
  name: true,
});

export const updateUserSchema = userSchema
  .omit({ email: true, password: true })
  .partial();

export const publicUserSchema = userSchema.omit({
  password: true,
});

export type User = z.infer<typeof userSchema>;
export type SignupUser = z.infer<typeof signupUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
