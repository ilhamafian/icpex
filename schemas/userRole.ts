import { z } from "zod";

export const userRoleSchema = z.enum([
  "ADMIN",
  "SECRETARY",
  "THESIS_JUDGE",
  "EBOOK_JUDGE",
]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  SECRETARY: "Secretary",
  THESIS_JUDGE: "Thesis Judge",
  EBOOK_JUDGE: "E-book Judge",
};

/** Roles in display / default-selection priority order. */
export function sortRoles(roles: readonly UserRole[]): UserRole[] {
  return userRoleSchema.options.filter((role) => roles.includes(role));
}
