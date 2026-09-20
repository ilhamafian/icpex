import { z } from "zod";

export const signupUserSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  name: z.string().min(1),
});

export const loginUserSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type SignupUser = z.infer<typeof signupUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
