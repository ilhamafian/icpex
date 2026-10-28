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

export const portalLoginSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export const changeUsernameSchema = z.object({
  current_password: z.string().min(1, "Current password is required."),
  username: z
    .string()
    .trim()
    .min(1, "Username is required.")
    .max(80, "Username is too long."),
});

export const resetPasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(1, "Confirm your new password."),
  })
  .refine((value) => value.password === value.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

/** @deprecated Use portalLoginSchema */
export const adminLoginSchema = portalLoginSchema;

export type SignupUser = z.infer<typeof signupUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type PortalLogin = z.infer<typeof portalLoginSchema>;
/** @deprecated Use PortalLogin */
export type AdminLogin = PortalLogin;
