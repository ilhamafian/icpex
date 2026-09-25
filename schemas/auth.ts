import { z } from "zod";

import { userRoleSchema } from "@/schemas/userRole";

export const signupUserSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  name: z.string().min(1),
});

export const loginUserSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const portalLoginSchema = z.object({
  role: userRoleSchema,
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

/** @deprecated Use portalLoginSchema */
export const adminLoginSchema = portalLoginSchema;

export type SignupUser = z.infer<typeof signupUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type PortalLogin = z.infer<typeof portalLoginSchema>;
/** @deprecated Use PortalLogin */
export type AdminLogin = PortalLogin;
