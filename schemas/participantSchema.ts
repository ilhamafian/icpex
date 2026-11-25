import { z } from "zod";

import { objectIdSchema } from "./objectId";

export const participantSchema = z.object({
  _id: objectIdSchema.optional(),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password_hash: z.string().min(1),
  email_verified: z.boolean().default(false),
  verification_token_hash: z.string().min(1).optional(),
  verification_expires_at: z.coerce.date().optional(),
  reset_token_hash: z.string().min(1).optional(),
  reset_expires_at: z.coerce.date().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Participant = z.infer<typeof participantSchema>;

export const participantSignupSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required."),
    email: z.string().trim().email("Enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

export const participantLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
  next: z.string().optional(),
});

export const participantEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
});

export const participantResetSchema = z
  .object({
    token: z.string().min(1, "This reset link is invalid."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });
