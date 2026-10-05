import { z } from "zod";
import { objectIdSchema } from "./objectId";
import { userRoleSchema } from "./userRole";

export { userRoleSchema, type UserRole } from "./userRole";

export const userStatusSchema = z.enum(["INVITED", "ACTIVE", "DISABLED"]);

/**
 * A role held by a user. ADMIN is global (no competition); every other role is
 * scoped to a single competition so staff reset when a new competition starts.
 */
export const roleGrantSchema = z
  .object({
    role: userRoleSchema,
    competition_id: z
      .string()
      .regex(/^[a-fA-F0-9]{24}$/, "Invalid competition id")
      .optional(),
  })
  .refine(
    (grant) => (grant.role === "ADMIN") === !grant.competition_id,
    "ADMIN is global; every other role needs a competition"
  );

export type RoleGrant = z.infer<typeof roleGrantSchema>;

export const userSchema = z.object({
  _id: objectIdSchema.optional(),
  email: z.email(),
  name: z.string().min(1).optional(),
  password_hash: z.string().min(1).optional(),
  roles: z.array(roleGrantSchema).min(1),
  status: userStatusSchema.default("INVITED"),
  email_verified: z.boolean().default(false),
  invite_token_hash: z.string().min(1).optional(),
  invite_expires_at: z.coerce.date().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export const inviteUserSchema = z.object({
  email: z.email(),
  role: userRoleSchema,
  /** Required for every role except ADMIN. */
  competition_id: objectIdSchema.optional(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).optional(),
});

export const updateUserSchema = userSchema
  .omit({ email: true, password_hash: true, invite_token_hash: true })
  .partial();

export const publicUserSchema = userSchema.omit({
  password_hash: true,
  invite_token_hash: true,
});

export type User = z.infer<typeof userSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type InviteUser = z.infer<typeof inviteUserSchema>;
export type AcceptInvite = z.infer<typeof acceptInviteSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;

export {
  signupUserSchema,
  loginUserSchema,
  portalLoginSchema,
  adminLoginSchema,
  type SignupUser,
  type LoginUser,
  type PortalLogin,
  type AdminLogin,
} from "./auth";
